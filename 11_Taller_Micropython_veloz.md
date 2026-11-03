# Acelerando MicroPython en Raspberry Pi Pico

## 1. SIO– Acceso directo a registros

Permite escribir y leer los GPIO accediendo directamente a los registros de hardware del RP2040, evitando algunas de las operaciones habituales de MicroPython. 


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

## 2. PIO  – Entrada y salida programable

Cuando necesitamos capturar o generar señales digitales paralelas a frecuencias del orden de MHz, podemos utilizar las máquinas de estado PIO del RP2040.

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

## 3. Segundo núcleo (\_thread)

El RP2040 permite ejecutar código en su segundo núcleo (Core 1), mientras el núcleo principal (Core 0) continúa ejecutando otras tareas.


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

## 4. Decoradores @micropython.native, @micropython.viper y @micropython.asm_thumb

MicroPython permite compilar funciones a código nativo para mejorar su velocidad de ejecución. Dependiendo de la operación, estas técnicas pueden proporcionar mejoras significativas de rendimiento.

```python
import micropython

@micropython.native
def suma_native(a, b):
    return a + b

@micropython.viper
#Viper lets you type variables and use C-style memory addresses.
def toggle(pin: int):
    import machine
    machine.mem32[0xD0000014] = 1 << pin

@micropython.asm_thumb
# Assembly.	Explore machine-level instructions
def add(a, b):
    add(r0, r0, r1)
```


## Reto: Crear un tacómetro en una pantalla OLED

* Combinar o modificar algunos de los códigos anteriores para desarrollar la manera más rápida y eficiente de dibujar un tacómetro en una pantalla OLED.

* El tacómetro debe representar gráficamente una escala circular y una aguja que indique un valor de velocidad.

* El objetivo es experimentar con diferentes técnicas de programación, comparar sus tiempos de ejecución y determinar cuál permite obtener el mejor rendimiento gráfico.
