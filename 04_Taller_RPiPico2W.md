# Taller de IoT — Raspberry Pi Pico 2 W
## Programación no bloqueante, Scheduler, Pub/Sub y PicoROS

## Propósito

En esta clase comenzaremos a programar la Raspberry Pi Pico 2 W como
un sistema IoT.

La pregunta central será:

> ¿Cómo podemos hacer que un microcontrolador atienda varias actividades
> sin que una de ellas bloquee a las demás?

Trabajaremos progresivamente con:

1. Raspberry Pi Pico 2 W
2. Thonny y MicroPython
3. REPL
4. Archivos
5. Scheduler y Task
6. Programación no bloqueante
7. Comparación con Arduino
8. Pub/Sub
9. MQTT
10. PicoROS
11. Watchdog
12. Flet como interfaz de monitoreo

---

# 1. Raspberry Pi Pico 2 W

## 1.1 ¿Qué es?

La Raspberry Pi Pico 2 W es una placa basada en un microcontrolador.

Puede ejecutar un programa directamente y comunicarse con diferentes
dispositivos mediante interfaces como:

- GPIO
- ADC
- PWM
- I²C
- UART
- SPI
- WiFi
- Bluetooth

En esta clase nos concentraremos inicialmente en la programación y
comunicación del sistema.

![](https://www.raspberrypi.com/documentation/microcontrollers/images/pico2w-pinout.svg)


---

# 2. Cuidados al trabajar con la Pico

Antes de conectar cualquier circuito:

- identificar GND;
- identificar las fuentes de alimentación;
- revisar el pinout;
- verificar la tensión del dispositivo;
- verificar los niveles lógicos;
- comprobar las conexiones antes de alimentar.

## 2.1 Evitar cortocircuitos

Nunca conectar directamente:

```text
3V3 ───── GND
````

Un cortocircuito puede dañar la placa.

## 2.2 Superficies

No colocar la Pico directamente sobre:

* papel aluminio;
* superficies metálicas;
* herramientas metálicas;
* cables sin aislamiento.

Es preferible trabajar sobre:

* papel;
* cartón;
* madera;
* plástico;
* otras superficies aislantes.

---
## 2.3 Alimentación y niveles lógicos

La Pico trabaja con lógica de **3.3 V**.

Esto debe tenerse en cuenta al conectar sensores y actuadores.

No asumir que un dispositivo que funciona con 5 V tiene señales compatibles con 3.3 V.

Antes de conectar un dispositivo:

1. Verificar tensión de alimentación.
2. Verificar nivel lógico.
3. Verificar corriente máxima.
4. Revisar el datasheet.

---



# 3. Thonny y MicroPython

## 3.1 Thonny

Thonny permite:

* escribir programas;
* cargarlos en la Pico;
* ejecutarlos;
* utilizar el REPL;
* administrar archivos de la placa.

---

# 4. Python vs. MicroPython

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

MicroPython se ejecuta directamente en el microcontrolador:

```text
Pico
 ↓
MicroPython
 ↓
Microcontrolador
 ↓
Hardware
```

MicroPython conserva muchas características de Python, pero está
adaptado a dispositivos con recursos limitados.

Por ello existen diferencias en:

* módulos disponibles;
* memoria;
* rendimiento;
* acceso al hardware.

---

# 5. REPL

REPL significa:

> Read — Eval — Print — Loop

Permite ejecutar instrucciones directamente sobre la Pico.

Por ejemplo:

```python
x = 10
```

Consultar:

```python
x
```

Cambiar:

```python
x = 20
```

Y volver a consultar:

```python
x
```

También podemos experimentar con objetos y funciones.

El REPL es especialmente útil para:

* explorar;
* probar;
* depurar;
* comprobar rápidamente una idea.

---

# 6. Archivos

La Pico puede almacenar archivos.

Una estructura sencilla puede ser:

```text
/
├── boot.py
├── main.py
└── config.txt
```

## 6.1 `main.py`

Es el programa principal que MicroPython ejecuta al iniciar.

## 6.2 `boot.py`

Se ejecuta durante el proceso de arranque.

Debe utilizarse con cuidado porque un error puede afectar el inicio del
sistema.

---

## 6.3 Leer y escribir archivos

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

# 7. Scheduler: la idea

Antes de programar el hardware debemos resolver un problema de diseño.

Nuestro sistema tendrá varias actividades:

```text
leer sensores
actualizar actuadores
procesar eventos
comunicarse
enviar información
actualizar estados
```

No queremos escribir un programa en el que una actividad tenga que
esperar a que todas las demás terminen.

La idea del Scheduler es organizar las actividades como tareas.

```text
                 Scheduler
                     │
       ┌─────────────┼─────────────┐
       ▼             ▼             ▼
    Task A         Task B        Task C
       │             │             │
    sensores       MQTT          estado
```

---

# 8. Clase Task

Una tarea puede representar:

* una función;
* un período de ejecución;
* el instante de su última ejecución.

Conceptualmente:

```python
class Task:

    def __init__(self, function, period_ms):
        self.function = function
        self.period_ms = period_ms
        self.last_run = 0
```

La tarea debe poder responder:

> ¿Ya es momento de ejecutar mi función?

---

# 9. Clase Scheduler

El Scheduler mantiene un conjunto de tareas.

Conceptualmente:

```text
Scheduler
│
├── Task: sensores     100 ms
├── Task: telemetría  1000 ms
├── Task: estado        50 ms
└── Task: MQTT         eventos
```

El Scheduler revisa las tareas y ejecuta aquellas que correspondan.

La idea fundamental es:

> **Una tarea no debe detener innecesariamente a las demás.**

---

# 10. ¿Por qué no ejecutar simplemente todo en `while True`?

Una primera aproximación podría ser:

```python
while True:
    read_sensor()
    update_motor()
    send_data()
```

Esto funciona mientras todas las funciones sean rápidas.

Pero aparece un problema cuando una función tarda demasiado.

Por ejemplo:

```python
while True:
    read_sensor()
    input()
    update_motor()
```

Mientras `input()` espera:

```text
sensor       detenido
motor        detenido
MQTT         detenido
otras tareas detenidas
```

El sistema está bloqueado.

---

# 11. El problema de `input()`

`input()` espera hasta que el usuario introduzca información.

Por ejemplo:

```python
name = input("Nombre: ")
```

El programa no continúa hasta recibir la entrada.

Esto es apropiado para un programa interactivo sencillo, pero no para
un sistema que debe atender simultáneamente sensores, comunicación y
actuadores.

---

# 12. El problema de `print()`

`print()` no bloquea de la misma manera que `input()`, pero tampoco es
una operación gratuita.

Enviar grandes cantidades de información por consola puede consumir
tiempo.

Por ejemplo, debemos evitar:

```python
while True:
    print(sensor_value)
```

especialmente en tareas que deben ejecutarse con mucha frecuencia.

Una buena práctica es utilizar `print()` principalmente para:

* diagnóstico;
* depuración;
* información relevante.

Y no como mecanismo principal de funcionamiento del sistema.

---

# 13. Medir antes de optimizar

No debemos asumir que una función es lenta.

Debemos medir.

Podemos medir el tiempo de ejecución utilizando microsegundos:

```python
start = time.ticks_us()

function()

elapsed = time.ticks_diff(
    time.ticks_us(),
    start
)

print(elapsed)
```

Esto permite identificar las operaciones que realmente consumen tiempo.

Principio:

> **Medir → identificar → optimizar → volver a medir.**

---

# 14.  El problema de los `sleep()` y la programación no bloqueante

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


Una tarea periódica puede utilizar el tiempo transcurrido en lugar de
esperar mediante un `sleep()` largo.

Por ejemplo:

```python
now = time.ticks_ms()

if time.ticks_diff(now, last_update) >= 100:
    update()
    last_update = now
```

Mientras no corresponde ejecutar `update()`, el programa puede continuar
atendiendo otras actividades.

---

# 15. Comparación con Arduino

Muchos estudiantes ya conocen Arduino.

La comparación nos permite entender diferentes formas de organizar
un programa de microcontrolador.

## Arduino tradicional

```cpp
void setup() {
    // configuración
}

void loop() {
    // programa principal
}
```

Conceptualmente:

```text
setup()
   ↓
loop()
   ↓
loop()
   ↓
loop()
   ↓
...
```

## Nuestro enfoque

```text
Scheduler
   │
   ├── Task
   ├── Task
   ├── Task
   └── Task
```

La diferencia que nos interesa no es:

> Arduino es malo y Scheduler es bueno.

Arduino también permite construir sistemas no bloqueantes.

La diferencia que queremos estudiar es la **forma de organizar las
actividades del sistema**.

---

# 16. `micropython.schedule()` no es nuestro Scheduler

MicroPython dispone de mecanismos propios para programar callbacks,
entre ellos `micropython.schedule()`.

No debemos confundirlo con la clase `Scheduler` utilizada en este curso.

En esta etapa utilizaremos:

```text
Scheduler
   ↓
organización de tareas
```

como una abstracción de diseño.

Más adelante, si es necesario, estudiaremos mecanismos específicos
de MicroPython.

---

# 17. Pub/Sub

Ahora podemos separar las actividades del sistema.

En lugar de:

```text
sensor → función → actuador
```

podemos utilizar un modelo Publish/Subscribe:

```text
Publisher
    │
    ▼
  Topic
    │
    ▼
Subscriber
```

Un componente publica información.

Otro componente se suscribe a esa información.

No necesitan conocerse directamente.

---

# 18. MQTT

MQTT implementa el modelo Publish/Subscribe.

Los elementos principales son:

* Broker
* Publisher
* Subscriber
* Topic
* Payload

Ejemplo:

```text
Pico
 │
 │ publish
 ▼
Broker
 │
 │ subscribe
 ▼
Flet
```

---

# 19. PicoROS

Utilizaremos una versión mínima de PicoROS para organizar la
comunicación del sistema.

La idea es disponer de:

```text
Publisher
Subscriber
Topic
Message
```

sin necesidad de introducir todavía todo ROS 2.

La arquitectura permite separar:

```text
productor de información
        │
        ▼
      Topic
        │
        ▼
consumidor de información
```

---

# 20. Watchdog

El sistema incluye un Watchdog para detectar problemas en el
funcionamiento del programa.

El Watchdog puede utilizarse para detectar situaciones en las que el
programa deja de responder correctamente.

Conceptualmente:

```text
Programa
   │
   │ alimenta Watchdog
   ▼
Watchdog
   │
   ├── programa funcionando
   │
   └── programa detenido
            ↓
          reset
```

El objetivo es aumentar la robustez del sistema.

---

# 21. Publicación de información del Watchdog

El sistema puede publicar información relacionada con su funcionamiento.

Por ejemplo:

```text
debug/watchdog
```

El mensaje puede contener información como:

```json
{
    "uptime_s": 120,
    "status": "ok"
}
```

La información puede ser recibida por una aplicación externa.

---

# 22. Flet como monitor

La aplicación Flet actuará inicialmente como un monitor.

```text
Pico
  │
  │ publish
  ▼
Comunicación
  │
  ▼
Flet
  │
  ▼
Interfaz
```

La interfaz debe permitir visualizar:

* conexión;
* mensajes recibidos;
* tópico;
* contenido del mensaje;
* estado del Watchdog.

---

# 23. Actividad

Aumentar la aplicación Flet del taller anterior, para que permita visualizar los mensajes publicados
por el Watchdog de PicoROS de su respectivo grupo.

---

# 24. Mini-reto

Modificar la interfaz para mostrar información de manera más útil.


---

# 25. Preguntas para discutir

1. ¿Qué ocurre si una tarea tarda demasiado?
2. ¿Por qué `input()` es problemático en un sistema IoT?
3. ¿Por qué debemos limitar el uso de `print()` en tareas rápidas?
4. ¿Qué diferencia existe entre una tarea y una interrupción?
5. ¿Qué problema intenta solucionar un Scheduler?
6. ¿Qué diferencia existe entre nuestro `Scheduler` y
   `micropython.schedule()`?
7. ¿Qué ventajas tiene Pub/Sub?
8. ¿Por qué MQTT utiliza un Broker?
9. ¿Qué información debería publicar un Watchdog?
10. ¿Qué ocurre si la interfaz Flet deja de recibir mensajes?

