# Accelerating MicroPython on RPi Pico

## 1. SIO

Allows writing/reading GPIO by touching registers directly:

```python
import machine

# SIO base address (see RP2040 datasheet)
SIO_BASE = 0xD0000000
GPIO_OUT_SET = SIO_BASE + 0x014
GPIO_OUT_CLR = SIO_BASE + 0x018

for i in range(8):
    p = machine.Pin(i, machine.Pin.OUT)

i = 0
while True:
    machine.mem32[GPIO_OUT_SET] = i
    machine.mem32[GPIO_OUT_CLR] = ~i
    i = (i + 1) % 256
```

## 2. PIO 

When you need to capture or generate parallel signals at MHz.

```python
from machine import Pin
from rp2 import PIO, StateMachine, asm_pio
from time import sleep

@asm_pio(out_init=(rp2.PIO.OUT_HIGH,) * 8, out_shiftdir=PIO.SHIFT_RIGHT,
         autopull=True, pull_thresh=16)
def paral_prog():
    pull()  
    out(pins, 8)  

paral_sm = StateMachine(0, paral_prog, freq=10000000, out_base=Pin(0))
paral_sm.active(1)

# paral_sm.put(0b0101)
# sleep(1)
# paral_sm.put(0b1010)
# sleep(1)

while True:
    for i in range(500):
        paral_sm.put(i)
```

## 3. Second Core (\_thread)

The RP2 allows launching code on core1.

```python
import _thread
import time

def core1_task():
    while True:
        print("Core1 working")
        time.sleep(0.01)

# Start core1
_thread.start_new_thread(core1_task, ())

# Core0 continues here
while True:
    print("Core0 main loop")
    time.sleep(0.5)
```

## 4. Decorators @micropython.native / @micropython.viper

Compile to native bytecode → 2–5× speedup.

```python
import micropython

@micropython.native
def suma_native(a, b):
    return a + b

@micropython.viper
def toggle(pin: int):
    import machine
    machine.mem32[0xD0000014] = 1 << pin

@micropython.asm_thumb
def add(a, b):
    add(r0, r0, r1)
```

Viper lets you type variables and use C-style memory addresses.

# Challenge
Join or modify some of these codes to create the fastest way to draw a tachometer on an OLED display
