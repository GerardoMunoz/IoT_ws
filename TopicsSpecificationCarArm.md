# MQTT Topics Specification for Differential Drive Robot with Arm

This document defines the MQTT topics and the expected JSON payloads to control the robot.

## 1. Immediate State

### Topic:

`UDFJC/iot_ws/robot0/state`


### Description:
Applies an immediate state to the robot, setting linear/angular velocities and arm joint angles for a given duration.

### Expected JSON payload:

```json
{
  "v_dm/s": 1.0,        // linear velocity [dm/s]
  "w_deg/s": 5.7,        // angular velocity [°/s]
  "alpha0_deg": 0,      // joint 0 angle [°]
  "alpha1_deg": 45,     // joint 1 angle [°]
  "alpha2_deg": 30,     // joint 2 angle [°]
  "duration_s": 15.7  // time in seconds to maintain this state
}
```

### Notes:

All fields are required except duration (default = 1.0 s).

The robot executes this state immediately when received.

## 2. Sequence Management

### Topic base:

`UDFJC/iot_ws/robot0/sequence`

### Description:

Manage the sequences

### Expected JSON payload:

```json
// Create a sequence
{
  "action": "create",
  "name": "hello",
  "run_at": "2025-09-25T20:00:00Z",
  "states": [
      { "v_dm/s": 2, "w_deg/s": 0, "alpha0_deg": 0, "alpha1_deg": 0, "alpha2_deg": 0, "duration_s": 5.0 },
      { "v_dm/s": 5.2, "w_deg/s": 30, "alpha0_deg": 0, "alpha1_deg": 0, "alpha2_deg": 0, "duration_s": 3.0 },
      { "v_dm/s": 0, "w_deg/s": 0, "alpha0_deg": -90, "alpha1_deg": 0, "alpha2_deg": 0, "duration_s": 1.0 },
      { "v_dm/s": 0, "w_deg/s": 0, "alpha0_deg": 90, "alpha1_deg": 0, "alpha2_deg": 0, "duration_s": 2.0 },
      { "v_dm/s": 0, "w_deg/s": 0, "alpha0_deg": 0, "alpha1_deg": 90, "alpha2_deg": 0, "duration_s": 1.0 },
      { "v_dm/s": 0, "w_deg/s": 0, "alpha0_deg": 0, "alpha1_deg": 0, "alpha2_deg": 90, "duration_s": 1.0 }
   ]
}

// Delete a sequence
{
  "action": "delete",
  "name": "hello"
}


// Execute a sequience immediately
{
  "action": "schedule",
  "name": "hello",
  "run_at": "now"
}

// Program the excution
{
  "action": "schedule",
  "name": "hello",
  "run_at": "2025-09-25T20:00:00Z"
}
```
