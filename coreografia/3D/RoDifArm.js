import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.158/build/three.module.js";

/**
 * RoDifArm: visual twin for a differential-drive robot with a 3-joint arm.
 *
 * Pub/Sub topics (configurable):
 *   <prefix>/robot<robotId>/RPi/state
 *   <prefix>/robot<robotId>/RPi/sequence
 *
 * The payload format follows TopicsSpecificationCarArm.md:
 *   state: { v_dm/s, w_deg/s, alpha0_deg, alpha1_deg, alpha2_deg, duration_s }
 *   sequence create: { action:"create", name:"...", states:[...] }
 *   sequence execute: { action:"execute_now", name:"..." }
 *   sequence schedule: { action:"schedule", name:"...", run_at:"now" | ISO date }
 *   sequence delete: { action:"delete", name:"..." }
 */
export class RoDifArm {
    constructor(scene, bus, options = {}) {
        if (!scene) throw new Error("RoDifArm requires a scene.");
        if (!bus) throw new Error("RoDifArm requires a Pub/Sub bus.");

        this.scene = scene;
        this.bus = bus;

        this.robotId = options.robotId ?? 0;
        this.prefix = (options.prefix ?? "UDFJC/iot_ws").replace(/\/+$/, "");
        this.topicBase = `${this.prefix}/robot${this.robotId}`;
        this.stateTopic = `${this.topicBase}/motion/state`;
        this.sequenceTopic = `${this.topicBase}/motion/sequence`;

        this.state = {
            x: options.x ?? 0,
            y: options.y ?? 0,
            beta: options.beta ?? 0,
            alpha0: options.alpha0 ?? 0,
            alpha1: options.alpha1 ?? 0,
            alpha2: options.alpha2 ?? 0,
            v: 0,
            w: 0
        };

        this.sequences = {
            ...(options.sequences ?? {})
        };
        this.motion = null;
        this.sequenceRuntime = null;
        this.scheduledTimers = new Set();

        this._build();

        // Use bus.sub when available: it registers locally and requests a
        // remote subscription. Otherwise, fall back to local bus.subscribe.
        this._subscribe(this.stateTopic, (topic, payload) => {
            this.handleState(payload);
        });
        this._subscribe(this.sequenceTopic, (topic, payload) => {
            this.handleSequence(payload);
        });

        // Compatibility option: subscribe to the legacy prefix as well.
        // Set legacyPrefix to null to disable it.
        if (options.legacyPrefix) {
            const legacyBase =
                `${String(options.legacyPrefix).replace(/\/+$/, "")}/robot${this.robotId}/RPi`;
            this._subscribe(`${legacyBase}/state`, (topic, payload) => {
                this.handleState(payload);
            });
            this._subscribe(`${legacyBase}/sequence`, (topic, payload) => {
                this.handleSequence(payload);
            });
        }

        this._render();
    }

    _subscribe(topic, callback) {
        const handler = (...args) => {
            // The dashboard PubSub invokes callbacks as (topic, message).
            // Also accept buses that invoke them as (message).
            const payload = args.length >= 2 ? args[1] : args[0];
            callback(topic, this._decodePayload(payload));
        };

        if (typeof this.bus.sub === "function") {
            this.bus.sub(topic, handler);
        } else if (typeof this.bus.subscribe === "function") {
            this.bus.subscribe(topic, handler);
        } else {
            throw new Error("The Pub/Sub bus must provide sub() or subscribe().");
        }
    }

    _decodePayload(payload) {
        if (typeof payload !== "string") return payload;
        try {
            return JSON.parse(payload);
        } catch {
            return payload;
        }
    }

    _number(value, fallback = 0) {
        const number = Number(value);
        return Number.isFinite(number) ? number : fallback;
    }

    _duration(payload, fallback = 1) {
        const value = this._number(payload?.duration_s, fallback);
        return Math.max(0.001, value);
    }

    /**
     * Convert a state from the topic specification to internal units.
     * Linear velocity is converted from dm/s to m/s; angular velocity and
     * joint angles are converted from degrees to radians.
     */
    _normalizeState(payload = {}) {
        const vDmS = this._number(payload["v_dm/s"], this._number(payload.v, 0));
        const wDegS = this._number(payload["w_deg/s"], this._number(payload.w, 0));

        const angle = (specKey, legacyKey, current) => {
            if (payload[specKey] !== undefined) {
                return THREE.MathUtils.degToRad(this._number(payload[specKey], 0));
            }
            if (payload[legacyKey] !== undefined) {
                // Legacy payloads used radians.
                return this._number(payload[legacyKey], current);
            }
            return current;
        };

        const returned = {
            v: vDmS * 0.1,
            w: THREE.MathUtils.degToRad(wDegS),
            alpha0: angle("alpha0_deg", "alpha0", this.state.alpha0),
            alpha1: angle("alpha1_deg", "alpha1", this.state.alpha1),
            alpha2: angle("alpha2_deg", "alpha2", this.state.alpha2),
            duration: this._duration(payload, 1)
        };
        console.log('_normalizeState',returned)
        return returned
    }

    handleState(payload) {
        if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
            console.warn(`[RoDifArm ${this.robotId}] Ignoring invalid state payload`, payload);
            return;
        }

        const state = this._normalizeState(payload);
        this.sequenceRuntime = null;
        this._startMotion(state);
    }

    handleSequence(payload) {
        if (typeof payload === "string") {
            payload = this._decodePayload(payload);
        }
        if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
            console.warn(`[RoDifArm ${this.robotId}] Ignoring invalid sequence payload`, payload);
            return;
        }

        const action = payload.action;
        const name = payload.name ?? payload.sequence?.name;

        switch (action) {
            case "create": {
                const states = payload.states ?? payload.sequence?.states;
                if (!name || !Array.isArray(states)) {
                    console.warn(`[RoDifArm ${this.robotId}] create requires name and states[]`, payload);
                    return;
                }
                this.sequences[name] = states.map(state => ({ ...state }));
                console.info(`[RoDifArm ${this.robotId}] Sequence "${name}" created (${states.length} states).`);
                break;
            }

            case "delete": {
                if (!name) return;
                delete this.sequences[name];
                if (this.sequenceRuntime?.name === name) {
                    this.sequenceRuntime = null;
                    this.motion = null;
                    this.state.v = 0;
                    this.state.w = 0;
                }
                console.info(`[RoDifArm ${this.robotId}] Sequence "${name}" deleted.`);
                break;
            }

            case "execute_now": {
                if (!name) {
                    console.warn(`[RoDifArm ${this.robotId}] execute_now requires name.`);
                    return;
                }
                this.runSequence(name);
                break;
            }

            case "schedule": {
                if (!name) {
                    console.warn(`[RoDifArm ${this.robotId}] schedule requires name.`);
                    return;
                }
                const runAt = payload.run_at ?? "now";
                if (runAt === "now" || runAt === "immediately") {
                    this.runSequence(name);
                    return;
                }

                const timestamp = Date.parse(runAt);
                if (!Number.isFinite(timestamp)) {
                    console.warn(`[RoDifArm ${this.robotId}] Invalid run_at value:`, runAt);
                    return;
                }

                const delay = Math.max(0, timestamp - Date.now());
                const timer = setTimeout(() => {
                    this.scheduledTimers.delete(timer);
                    this.runSequence(name);
                }, delay);
                this.scheduledTimers.add(timer);
                break;
            }

            default:
                console.warn(`[RoDifArm ${this.robotId}] Unknown sequence action:`, action);
        }
    }

    _startMotion(normalizedState) {
        const duration = Math.max(0.001, normalizedState.duration);
        this.motion = {
            v: normalizedState.v,
            w: normalizedState.w,
            duration,
            elapsed: 0,
            startAngles: {
                alpha0: this.state.alpha0,
                alpha1: this.state.alpha1,
                alpha2: this.state.alpha2
            },
            targetAngles: {
                alpha0: normalizedState.alpha0,
                alpha1: normalizedState.alpha1,
                alpha2: normalizedState.alpha2
            }
        };
        this.state.v = normalizedState.v;
        this.state.w = normalizedState.w;
    }

    runSequence(name) {
        const states = this.sequences[name];
        if (!Array.isArray(states) || states.length === 0) {
            console.warn(`[RoDifArm ${this.robotId}] Sequence "${name}" does not exist or is empty.`);
            return false;
        }

        // Copy the states so playback never mutates the stored sequence.
        this.sequenceRuntime = {
            name,
            states: states.map(state => ({ ...state })),
            index: 0
        };
        this._startNextSequenceState();
        console.info(`[RoDifArm ${this.robotId}] Executing sequence "${name}".`);
        return true;
    }

    _startNextSequenceState() {
        if (!this.sequenceRuntime) return;

        const runtime = this.sequenceRuntime;
        if (runtime.index >= runtime.states.length) {
            this.sequenceRuntime = null;
            this.motion = null;
            this.state.v = 0;
            this.state.w = 0;
            return;
        }

        const rawState = runtime.states[runtime.index++];
        this._startMotion(this._normalizeState(rawState));
    }

    /**
     * Called by CorridorScene's animation loop. deltaTime is expected in
     * seconds, as in the original RoDifArm implementation.
     */
    update(deltaTime) {
        let remaining = Math.max(0, this._number(deltaTime, 0));
        let guard = 0;

        // Consume large frame deltas across sequence boundaries safely.
        while (remaining > 0 && this.motion && guard++ < 100) {
            const motion = this.motion;
            const available = Math.max(0, motion.duration - motion.elapsed);
            const step = Math.min(remaining, available);

            if (step > 0) {
                this.state.x += motion.v * Math.cos(this.state.beta) * step;
                this.state.y -= motion.v * Math.sin(this.state.beta) * step;
                this.state.beta += motion.w * step;

                motion.elapsed += step;
                remaining -= step;

                const t = Math.min(1, motion.elapsed / motion.duration);
                for (const key of ["alpha0", "alpha1", "alpha2"]) {
                    const start = motion.startAngles[key];
                    const end = motion.targetAngles[key];
                    this.state[key] = start + (end - start) * t;
                }
            }

            if (motion.elapsed >= motion.duration) {
                this.state.v = 0;
                this.state.w = 0;

                if (this.sequenceRuntime) {
                    this._startNextSequenceState();
                } else {
                    this.motion = null;
                }

                // Prevent a zero-duration step from locking the animation loop.
                if (step === 0 && !this.motion) break;
            } else {
                break;
            }
        }

        this._render();
    }

    moveTo(delta = {}) {
        for (const [key, value] of Object.entries(delta)) {
            if (Object.prototype.hasOwnProperty.call(this.state, key)) {
                this.state[key] += this._number(value, 0);
            }
        }
        this._render();
    }

    _build() {
        const base = new THREE.Mesh(
            new THREE.BoxGeometry(2, 0.5, 2),
            new THREE.MeshBasicMaterial({ color: 0x0077ff })
        );
        base.position.y = 0.3;
        this.group = new THREE.Group();
        this.group.add(base);
        this.scene.add(this.group);
        this.base = base;

        const wheelGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.5, 32);
        const wheelMaterial = new THREE.MeshBasicMaterial({ color: 0x222222 });
        const wheelOffsets = [
            [0.7, 0.4, 1.2],
            [0.7, 0.4, -1.2],
            [-0.7, 0.4, 1.2],
            [-0.7, 0.4, -1.2]
        ];

        for (const [x, y, z] of wheelOffsets) {
            const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
            wheel.rotation.x = Math.PI / 2;
            wheel.position.set(x, y, z);
            this.group.add(wheel);
        }

        const armColor = 0x00fff0;
        const a1 = 0.5;
        const a2 = 1;
        const a3 = 1;
        const material = new THREE.MeshBasicMaterial({ color: armColor });

        const armBase = new THREE.Mesh(
            new THREE.BoxGeometry(0.5, a1, 0.5),
            material
        );
        armBase.translateY(a1 / 2);
        armBase.translateX(0.6);
        base.add(armBase);
        this.armBase = armBase;

        const shoulder = new THREE.Object3D();
        shoulder.translateY(a1 / 2);
        armBase.add(shoulder);
        this.shoulder = shoulder;

        const lowerArm = new THREE.Mesh(
            new THREE.BoxGeometry(a2, 0.2, 0.2),
            material
        );
        lowerArm.translateX(a2 / 2);
        shoulder.add(lowerArm);

        const elbow = new THREE.Object3D();
        elbow.translateX(a2 / 2);
        lowerArm.add(elbow);
        this.elbow = elbow;

        const arm = new THREE.Mesh(
            new THREE.BoxGeometry(a3, 0.1, 0.1),
            material
        );
        arm.translateX(a3 / 2);
        elbow.add(arm);

        const wrist = new THREE.Object3D();
        wrist.translateX(a3 / 2);
        arm.add(wrist);

        const hand = new THREE.Mesh(
            new THREE.TorusGeometry(0.1, 0.01, 3, 9, 5.6),
            material
        );
        hand.rotation.y = Math.PI / 2;
        hand.rotation.x = Math.PI / 2;
        wrist.add(hand);

        // Keep the same integration point expected by CorridorScene.
        if (typeof this.scene.addAnimation === "function") {
            this.scene.addAnimation(this);
        }
    }

    _render() {
        if (!this.group) return;
        this.group.position.set(this.state.x, 0, this.state.y);
        this.group.rotation.y = this.state.beta;
        this.armBase.rotation.y = this.state.alpha0;
        this.shoulder.rotation.z = this.state.alpha1;
        this.elbow.rotation.z = this.state.alpha2 - this.state.alpha1;
    }

    dispose() {
        for (const timer of this.scheduledTimers) clearTimeout(timer);
        this.scheduledTimers.clear();

        if (this.scene && typeof this.scene.removeAnimation === "function") {
            this.scene.removeAnimation(this);
        }
        if (this.group && this.scene?.remove) {
            this.scene.remove(this.group);
        }
        this.motion = null;
        this.sequenceRuntime = null;
    }
}
