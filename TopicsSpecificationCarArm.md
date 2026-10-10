# MQTT Topics Specification for Differential Drive Robot with Arm

This document defines the MQTT topics and the expected JSON payloads to control the robot.

## 1. Immediate State

### Topic:

`UDFJC/iot_ws/robot0/RPi/state`


### Description:
Applies an immediate state to the robot, setting linear/angular velocities and arm joint angles for a given duration.

### Expected JSON payload:

```json
{
  "v_dm/s": 0.2,        // linear velocity [dm/s]
  "w_deg/s": 0.0,        // angular velocity [°/s]
  "alfa0_deg": 0,      // joint 0 angle [°]
  "alfa1_deg": 45,     // joint 1 angle [°]
  "alfa2_deg": 30,     // joint 2 angle [°]
  "duration_s": 2.0  // time in seconds to maintain this state
}
```

### Notes:

All fields are required except duration (default = 1.0 s).

The robot executes this state immediately when received.

## 2. Sequence Management

### Topic base:

`UDFJC/iot_ws/robot0/RPi/sequence`

### Description:

Manage the sequences

### Expected JSON payload:

```json
// Create a sequence
{
  "action": "create",
  "name": "saludo",
  "time": "2025-09-25T20:00:00Z",
  "states": [
      { "v_dm/s": 10, "w_deg/s": 0, "alfa0_deg": 0, "alfa1_deg": 0, "alfa2_deg": 0, "duration_s": 1.0 },
      { "v_dm/s": 15.7, "w_deg/s": 90, "alfa0_deg": 0, "alfa1_deg": 0, "alfa2_deg": 0, "duration_s": 1.0 },
      { "v_dm/s": 0, "w_deg/s": 0, "alfa0_deg": -90, "alfa1_deg": 0, "alfa2_deg": 0, "duration_s": 1.0 },
      { "v_dm/s": 0, "w_deg/s": 0, "alfa0_deg": 90, "alfa1_deg": 0, "alfa2_deg": 0, "duration_s": 2.0 },
      { "v_dm/s": 0, "w_deg/s": 0, "alfa0_deg": 0, "alfa1_deg": 90, "alfa2_deg": 0, "duration_s": 1.0 },
      { "v_dm/s": 0, "w_deg/s": 0, "alfa0_deg": 0, "alfa1_deg": 0, "alfa2_deg": 90, "duration_s": 1.0 }
   ]
}

// Delete a sequence
{
  "action": "delete",
  "name": "saludo"
}


// Execute a sequience immediately
{
  "action": "schedule",
  "name": "saludo",
  "time": "now"
}

// Program the excution
{
  "action": "schedule",
  "name": "saludo",
  "time": "2025-09-25T20:00:00Z"
}
```
