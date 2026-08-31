
# Taller de IoT — Raspberry Pi Pico 2 W

## Propósito

En esta clase comenzaremos a interactuar con el mundo físico.

Hasta ahora hemos trabajado principalmente con:

- Python
- JSON
- MQTT
- Flet
- GitHub
- pruebas automáticas

Ahora incorporaremos:

- Raspberry Pi Pico 2 W
- MicroPython
- GPIO
- botones
- LEDs
- sensores
- comunicación con MQTT

![](https://www.raspberrypi.com/documentation/microcontrollers/images/pico2w-pinout.svg)

La pregunta central será:

> ¿Cómo hacemos que un programa reaccione al mundo físico sin bloquearse?

---

# 1. Conociendo la Raspberry Pi Pico 2 W

## 1.1 ¿Qué es?

La Raspberry Pi Pico 2 W es una placa con un microcontrolador que permite ejecutar programas directamente sobre el dispositivo.

A diferencia de un computador convencional, la Pico tiene recursos mucho más limitados, pero puede interactuar directamente con:

- GPIO
- ADC
- PWM
- I²C
- UART
- SPI
- WiFi
- Bluetooth

---

# 2. Cuidados al trabajar con la Pico

## 2.1 Evitar cortocircuitos

Antes de conectar cualquier circuito:

- Identificar GND.
- Identificar 3V3.
- Identificar VSYS/VBUS.
- Revisar el pinout.
- Verificar la conexión antes de alimentar.

Nunca conectar directamente:

```text
3V3 ───── GND
````

Esto produce un cortocircuito.

---

## 2.2 Evitar superficies conductoras

No colocar la Pico directamente sobre:

* papel aluminio;
* superficies metálicas;
* herramientas metálicas;
* cables sueltos.

Se puede trabajar sobre:

* papel;
* cartón;
* madera;
* plástico;
* una superficie aislante.

Una buena práctica es colocar la Pico sobre una base aislante.

---

# 3. Alimentación y niveles lógicos

La Pico trabaja con lógica de **3.3 V**.

Esto debe tenerse en cuenta al conectar sensores y actuadores.

No asumir que un dispositivo que funciona con 5 V tiene señales compatibles con 3.3 V.

Antes de conectar un dispositivo:

1. Verificar tensión de alimentación.
2. Verificar nivel lógico.
3. Verificar corriente máxima.
4. Revisar el datasheet.

---

# 4. Conectar la Pico al computador

La conexión inicial se realiza mediante USB.

El computador permite:

* alimentar la Pico;
* cargar programas;
* comunicarse con la Pico;
* utilizar el REPL.

---

# 5. Thonny

Thonny es un entorno de desarrollo que facilita trabajar con MicroPython.

Permite:

* editar archivos;
* cargar programas;
* ejecutarlos;
* utilizar el REPL;
* explorar archivos almacenados en la Pico.

---

# 6. Python vs. MicroPython

## Python

Python normalmente se ejecuta en un computador:

```text
Computador
    ↓
Python
    ↓
Sistema operativo
    ↓
Hardware
```

## MicroPython

MicroPython se ejecuta directamente en el microcontrolador:

```text
Pico
 ↓
MicroPython
 ↓
Microcontrolador
 ↓
GPIO / ADC / PWM / I²C
```

MicroPython mantiene muchas características de Python, pero está diseñado para dispositivos con recursos limitados.

Por eso existen diferencias en:

* módulos disponibles;
* rendimiento;
* memoria;
* acceso al hardware.

---

# 7. El REPL

REPL significa:

> Read — Eval — Print — Loop

Permite ejecutar instrucciones directamente en la Pico.

Por ejemplo:

```python
>>> x = 10
>>> x
10

>>> x = 20
>>> x
20
```

Podemos cambiar el valor:

```python
>>> x = "Hola"
>>> x
'Hola'
```

Y observar inmediatamente el resultado.

---

# 8. El REPL no es solamente para probar variables

También podemos utilizarlo para explorar el hardware.

Por ejemplo:

```python
from machine import Pin

led = Pin("LED", Pin.OUT)

led.value(1)
```

Después:

```python
led.value(0)
```

Esto permite experimentar rápidamente antes de escribir un programa completo.

---

# 9. Archivos en la Pico

La Pico puede almacenar archivos.

Por ejemplo:

```text
/
├── boot.py
├── main.py
└── datos.txt
```

## `main.py`

Es el programa principal que MicroPython ejecuta automáticamente al iniciar.

## `boot.py`

Se ejecuta durante el proceso de arranque.

Debe utilizarse con cuidado porque un error aquí puede afectar el inicio del sistema.

---

# 10. Leer y escribir archivos

Ejemplo:

```python
with open("datos.txt", "w") as file:
    file.write("Hola IoT")
```

Leer:

```python
with open("datos.txt", "r") as file:
    data = file.read()

print(data)
```

Los archivos pueden utilizarse para almacenar:

* configuración;
* parámetros;
* registros;
* estados.

---

# 11. El problema de `input()` y `print()`

## `input()` bloquea

En Python ya vimos que:

```python
input()
```

puede bloquear el programa mientras espera una entrada.

En un sistema IoT esto puede ser un problema.

Supongamos:

```python
while True:
    command = input()
    read_sensor()
    update_motor()
```

Mientras esperamos `input()`:

```text
sensor      ❌
motor       ❌
MQTT        ❌
otras tareas ❌
```

El sistema deja de responder.


##  `print()` es lento

`print()` puede ser considerablemente más lento que operaciones simples.

No utilizarlo continuamente dentro de tareas rápidas.
---

# 12. El problema de los `sleep()` largos

También podemos bloquear el programa con:

```python
sleep(5)
```

Durante esos cinco segundos no podemos atender adecuadamente otras tareas.

Esto puede ser especialmente problemático cuando tenemos:

* sensores;
* motores;
* MQTT;
* botones;
* interfaz;
* seguridad.

---

# 13. Estructura tradicional tipo Arduino

Una estructura muy común es:

```python
while True:
    leer_sensor()
    actualizar_motor()
    enviar_mqtt()
    sleep(1)
```

Es sencilla, pero puede convertirse en un problema cuando las tareas tienen diferentes frecuencias.

Por ejemplo:

```text
sensor       cada 10 ms
botón        continuamente
motor        cada 20 ms
MQTT         cuando llegue un mensaje
telemetría   cada 1 s
```

No queremos que una tarea lenta bloquee a las demás.

---

# 14. Programación no bloqueante

La idea es que cada tarea haga una pequeña cantidad de trabajo y devuelva rápidamente el control.

En lugar de:

```python
sleep(1)
```

podemos utilizar el tiempo transcurrido:

```python
now = time.ticks_ms()

if time.ticks_diff(now, last_update) >= 1000:
    update()
    last_update = now
```

El programa puede continuar realizando otras tareas mientras espera.

---

# 15. Scheduler

Podemos organizar las tareas como:

```text
Scheduler
   │
   ├── Task: leer sensores
   ├── Task: actualizar motores
   ├── Task: procesar botones
   ├── Task: MQTT
   └── Task: telemetría
```

Cada tarea tiene:

* una función;
* una frecuencia o período;
* un estado.

Por ejemplo:

```python
Task(
    update_sensors,
    period_ms=100
)
```

La idea es que el Scheduler determine cuándo ejecutar cada tarea.

---

# 16. Clase Task

Una posible abstracción:

```python
class Task:
    def __init__(self, function, period_ms):
        self.function = function
        self.period_ms = period_ms
        self.last_run = 0

    def update(self, now):
        if time.ticks_diff(now, self.last_run) >= self.period_ms:
            self.function()
            self.last_run = now
```

El objetivo no es crear un framework complejo.

El objetivo es comprender la idea:

> Una tarea puede ejecutarse periódicamente sin detener todo el programa.

---

# 17. Interrupciones



Una interrupción permite responder a determinados eventos del hardware sin esperar al ciclo normal del programa.

Ejemplo conceptual:

```python
button.irq(
    trigger=Pin.IRQ_FALLING,
    handler=button_pressed
)
```

Cuando ocurre el evento:

```text
Botón
  ↓
interrupción
  ↓
handler
```

---

# 18. ¿Interrupción o Scheduler?

No todos los problemas necesitan interrupciones.

### Scheduler

Adecuado para:

* leer sensores periódicamente;
* actualizar motores;
* enviar telemetría;
* revisar estados.

### Interrupciones

Adecuadas para:

* eventos muy rápidos;
* pulsadores;
* encoders;
* señales externas.

Una regla práctica:

> Mantener las rutinas de interrupción muy cortas.

Evitar dentro de una interrupción:

* operaciones largas;
* `print()`;
* acceso complejo a archivos;
* operaciones de red;
* cálculos pesados.

La interrupción puede registrar que ocurrió un evento y dejar el procesamiento para una tarea normal.
[https://docs.micropython.org/en/latest/reference/isr_rules.html](https://docs.micropython.org/en/latest/reference/isr_rules.html)

---

## `micropython.schedule`

Las tareas largas se pueden delegar a `micropython.schedule`

---

# 19. GPIO

Un GPIO puede utilizarse como:

* entrada;
* salida.

## Ejemplo de salida digital:

```python
from machine import Pin

led = Pin("LED", Pin.OUT)

led.value(1)
```

Apagar:

```python
led.value(0)
```

---

## Ejemplo de entrada digital

Ejemplo:

```python
button = Pin(
    15,
    Pin.IN,
    Pin.PULL_UP
)
```

Leer:

```python
value = button.value()
```

Podemos utilizar el botón para cambiar el estado de un LED.

---

# 20. Primer sistema IoT físico

Construiremos:

```text
Botón
  ↓
Pico
  ↓
Lógica
  ↓
LED
```

Ejemplo:

```text
Botón presionado
      ↓
    Pico
      ↓
LED encendido
```

---

# 21. Pub/Sub

Hasta ahora podemos pensar en:

```text
Botón → función → LED
```

Pero en IoT queremos separar componentes.

Podemos utilizar:

```text
Publisher
     │
     ▼
   Topic
     │
     ▼
Subscriber
```

Por ejemplo:

```text
Pico
 │
 │ publish
 ▼
cararm/led
 │
 │ subscribe
 ▼
Aplicación
```

---


# 22. Integrar GPIO y MQTT

Podemos construir:

```text
                    MQTT
                     │
                     ▼
                 Raspberry
                   Pi Pico
                     │
             ┌───────┴───────┐
             ▼               ▼
           LED             Botón
             │               │
             └───────┬───────┘
                     ▼
                    MQTT
```

Por ejemplo:

```text
cararm/led/set
```

Payload:

```json
{
    "value": 1
}
```

Y para informar el estado:

```text
cararm/led/state
```

---

# 23. Teclado/control remoto IR

Un control remoto IR permite generar diferentes comandos.

Por ejemplo:

```text
Control IR
    ↓
Receptor IR
    ↓
Pico
    ↓
Código del botón
    ↓
Acción
```

Cada botón puede representar una operación:

```text
↑      avanzar
↓      retroceder
←      girar izquierda
→      girar derecha
OK     detener
1      función 1
2      función 2
...
```

---

# 24. Taller: Control de acceso

Construir un sistema de control de acceso.

## Componentes

* Raspberry Pi Pico 2 W
* Receptor IR
* Control remoto
* LED
* Pulsador

## Comportamiento

El usuario debe introducir una secuencia utilizando el control remoto.

Ejemplo:

```text
1 → 2 → 3 → OK
```

Si la secuencia es correcta:

```text
LED → acceso permitido
```

Si es incorrecta:

```text
LED → acceso denegado
```

---

# 25. Prácticas

1. **Controlar un LED desde Flet**
   Desarrollar una interfaz en Flet que permita encender y apagar un LED conectado a la Raspberry Pi Pico 2 W.

2. **Leer el estado de un botón desde Flet**
   Desarrollar una interfaz en Flet que permita visualizar el estado de un botón conectado a la Raspberry Pi Pico 2 W.

3. **Leer un control remoto IR desde Flet**
   Conectar un receptor infrarrojo a la Raspberry Pi Pico 2 W y desarrollar una interfaz en Flet que permita visualizar los códigos recibidos al presionar los botones del control remoto.

---

### Taller — Sistema de control de acceso y alarma

Desarrollar un **sistema de control de acceso** utilizando la Raspberry Pi Pico 2 W, un botón, un LED y un control remoto IR. El sistema deberá contar además con una interfaz en Flet que permita visualizar y simular el estado de la alarma.

#### Requisitos

* **Sensor de puerta:** utilizar un botón para simular el estado de la Puerta 1:

  * `0` → puerta cerrada.
  * `1` → puerta abierta.

* **Indicador de alarma:** utilizar un LED para indicar el estado de la alarma:

  * LED apagado → alarma desactivada.
  * LED encendido → alarma activada.

* **Activación y desactivación:** utilizar el control remoto IR para introducir una contraseña que permita activar o desactivar la alarma.

* **Detección de intrusión:** cuando la alarma esté activada, si la puerta se abre, el sistema deberá disparar la alarma.

* **Contraseña incorrecta:** si se introduce una contraseña incorrecta, el sistema deberá disparar la alarma.

* **Simulación en Flet:** la interfaz deberá mostrar el estado de la puerta y de la alarma, y deberá **simular visual y/o sonoramente el disparo de la alarma**.

* **Comunicación:** los eventos importantes del sistema deberán poder visualizarse en la interfaz.



**Mini-reto opcional:** incorporar un contador de intentos fallidos y bloquear temporalmente el sistema después de varios intentos incorrectos, el LED titila mientras está bloqueado.
