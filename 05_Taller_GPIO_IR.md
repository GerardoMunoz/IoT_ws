
# 05_GPIO_IR — GPIO, control IR y comunicación con Flet

## 1. Objetivos

Al finalizar este taller, el estudiante será capaz de:

- Utilizar la librería `machine` de MicroPython.
- Configurar y utilizar GPIO como entradas y salidas digitales.
- Comprender el funcionamiento de las clases `GPIOIn` y `GPIOOut`.
- Comprender el funcionamiento básico de un receptor infrarrojo.
- Reconocer el papel de la modulación de 38 kHz en los controles remotos IR.
- Comprender, a nivel introductorio, el papel de la PIO de la Raspberry Pi Pico.
- Utilizar la clase `IRIn` para recibir códigos de un control remoto.
- Integrar entradas y salidas físicas con una interfaz desarrollada en Flet.
- Construir un sistema básico de control de acceso y alarma.

---

# 2. La librería `machine`

MicroPython proporciona la librería `machine` para acceder a los recursos físicos del microcontrolador.

Algunas de sus clases principales son:

| Clase | Función |
|---|---|
| `Pin` | Entradas y salidas digitales |
| `PWM` | Generación de señales PWM |
| `ADC` | Lectura de señales analógicas |
| `I2C` | Comunicación mediante I²C |
| `SPI` | Comunicación mediante SPI |
| `UART` | Comunicación serial |
| `Timer` | Temporizadores |

En este taller nos concentraremos principalmente en la clase `Pin`.

```python
from machine import Pin
````

---

# 3. GPIO y la clase `Pin`

Un GPIO puede utilizarse como:

* **Entrada (`Pin.IN`)**: permite leer el estado de un dispositivo.
* **Salida (`Pin.OUT`)**: permite controlar un dispositivo.

## 3.1. GPIO como salida

Por ejemplo, podemos conectar un LED al GPIO 0:

```python
from machine import Pin

led = Pin(0, Pin.OUT)
```

Para controlar el LED:

```python
led.value(1)
```

enciende el LED, mientras:

```python
led.value(0)
```

lo apaga.

También podemos utilizar:

```python
led.on()
led.off()
```



---

## 3.2. GPIO como entrada

Para leer un botón conectado al GPIO 16:

```python
from machine import Pin

boton = Pin(16, Pin.IN)
```

Podemos consultar su estado mediante:

```python
estado = boton.value()
```

El resultado será:

```text
0
```

o:

```text
1
```

De esta manera:

```text
               GPIO

        ┌───────────────┐
        │               │
     ENTRADA          SALIDA
        │               │
        ▼               ▼
      botón            LED
        │               │
      leer            controlar
```

---

# 4. De `Pin` a clases

Aunque podemos controlar directamente un GPIO utilizando `Pin`, en nuestro proyecto utilizaremos clases que encapsulan esta funcionalidad.

Esto permite separar:

* el funcionamiento del hardware;
* la comunicación;
* la lógica de la aplicación.

En este taller utilizaremos tres clases principales:

```text
GPIOIn
GPIOOut
IRIn
```

Estas clases representan diferentes formas de interacción con el hardware.

---

# 5. Clase `GPIOOut`

La clase `GPIOOut` representa un dispositivo controlado mediante un GPIO de salida.

En nuestro caso utilizaremos un LED.

Conceptualmente:

```text
Flet
  │
  │ mensaje
  ▼
PubSub / MQTT
  │
  ▼
GPIOOut
  │
  ▼
GPIO
  │
  ▼
LED
```

La clase configura el GPIO como salida:

```python
import json
from machine import Pin


class GPIOOut:

    def __init__(self, pubsub, gpio):
        """
        gpio: string que identifica el GPIO.
              Ejemplo: "GP0", "GP1", "GP25"

        El LED se controla mediante el tópico:
              GPIOOut/<gpio>

        Payload esperado:
              {"value": 1}
              {"value": 0}
        """

        self.pubsub = pubsub
        self.gpio = gpio

        # Extraer número del GPIO
        try:
            pin_number = int(gpio.replace("GP", ""))
        except:
            pin_number=gpio

        self.pin = Pin(pin_number, Pin.OUT)

        # Inicialmente apagado
        self.pin.value(0)

        # Suscripción
        self.topic = "GPIOOut/" + gpio
        print("GPIOOut subscribe",self.topic)
        self.pubsub.subscribe(self.topic, self._callback)


    def _callback(self, topic, msg):
        print("GPIOOut calllback:", topic, msg,type(msg))
        try:
            value = msg.get("value")
            print("GPIOOut calllback v",value,type(value))
            if value == 1:
                self.pin.value(1)

            elif value == 0:
                self.pin.value(0)

        except Exception as e:
            print("GPIOOut error:", e)


if __name__ == "__main__":
    from watchdog_task import WatchdogTask
    from scheduler import Scheduler
    from wifi_manager import WiFiManager
    from node import Node
    from pubsub_mqtt import PubSubMQTT



    SSID="Ejemplo" #  Change to your WiFi
    PSW_FILE=".env" # File name with password
    MQTT_BROKER="broker.hivemq.com"
    NODE_NAME='emb_node_0'
    PREFIX='UDFJC/iot_ws/robot0/'

    with open(PSW_FILE) as f:
        password = f.read().strip()

    scheduler = Scheduler()
    print('Scheduler')
    wifi = WiFiManager(ssid=SSID, password=password) 
    node = Node(prefix=PREFIX, node_name=NODE_NAME)
    PubSubMQTT(client_id=NODE_NAME, broker=MQTT_BROKER,  scheduler=scheduler, node=node, period_ms=100, prefix=PREFIX)
    WatchdogTask(scheduler=scheduler, pubsub=node, wifi=wifi, period_ms=9000)
    print('Initialized')
    GPIOOut(node, "LED")


    scheduler.run()

# 1. Publicar
# 2. Suscribirse
# 0. Salir
# Opción: 1
# Topic: UDFJC/iot_ws/robot0/GPIOOut/LED
# Payload: {"value":1}
# 
# 1. Publicar
# 2. Suscribirse
# 0. Salir
# Opción: 1
# Topic: UDFJC/iot_ws/robot0/GPIOOut/LED
# Payload: {"value":0}


```




## Actividad de exploración

Analizar la clase `GPIOOut` y responder:

1. ¿Dónde se configura el GPIO?
2. ¿Por qué se utiliza `Pin.OUT`?
3. ¿A qué tópico se suscribe la clase?
4. ¿Qué ocurre cuando recibe `{"value":1}`?
5. ¿Qué ocurre cuando recibe `{"value":0}`?

---

# 6. Clase `GPIOIn`

Ahora estudiaremos el caso contrario.

`GPIOIn` representa un GPIO utilizado como entrada.

Por ejemplo, podemos conectar un botón:

```text
Botón
  │
  ▼
GPIO
  │
  ▼
GPIOIn
  │
  │ publish
  ▼
PubSub / MQTT
  │
  ▼
Flet
```

La clase configura el GPIO como entrada:

```python
from machine import Pin
from task import Task


class GPIOIn(Task):

    def __init__(
        self,
        scheduler,
        pubsub,
        gpio,
        period_ms=5000,
    ):
        """
        gpio: string que identifica el GPIO.
              Ejemplo: "GP0", "GP1", "GP25"

        Publica el valor del GPIO en:

              GPIOIn/<gpio>

        Payload:

              {"value": 0}
              {"value": 1}

        period_ms:
              tiempo entre publicaciones.
        """

        self.pubsub = pubsub
        self.gpio = gpio

        # Extraer número del GPIO
        pin_number = int(gpio.replace("GP", ""))

        # Configurar como entrada
        self.pin = Pin(pin_number, Pin.IN)

        # Topic
        self.topic = "GPIOIn/" + gpio

        print("GPIOIn initialized", self.topic)

        # Inicializar Task
        super().__init__(
            scheduler,
            period_ms=period_ms
        )


    def update(self):

        value = self.pin.value()

        msg = {
            "value": value
        }

        print(
            "GPIOIn:",
            self.gpio,
            value
        )

        self.pubsub.publish(
            self.topic,
            msg
        )


if __name__ == "__main__":
    from watchdog_task import WatchdogTask
    from scheduler import Scheduler
    from wifi_manager import WiFiManager
    from node import Node
    from pubsub_mqtt import PubSubMQTT



    SSID="Ejemplo" #  Change to your WiFi
    PSW_FILE=".env" # File name with password
    MQTT_BROKER="broker.hivemq.com"
    NODE_NAME='emb_node_0'
    PREFIX='UDFJC/iot_ws/robot0/'

    with open(PSW_FILE) as f:
        password = f.read().strip()

    scheduler = Scheduler()
    print('Scheduler')
    wifi = WiFiManager(ssid=SSID, password=password) 
    node = Node(prefix=PREFIX, node_name=NODE_NAME)
    PubSubMQTT(client_id=NODE_NAME, broker=MQTT_BROKER,  scheduler=scheduler, node=node, period_ms=100, prefix=PREFIX)
    WatchdogTask(scheduler=scheduler, pubsub=node, wifi=wifi, period_ms=9000)
    print('Initialized')
    GPIOIn(scheduler,node, "GP1")


    scheduler.run()


```



## Actividad de exploración

Analizar `GPIOIn` y responder:

1. ¿Por qué el GPIO se configura como `Pin.IN`?
2. ¿Cómo se obtiene el estado del botón?
3. ¿Qué información publica?
4. ¿Cuál es el tópico utilizado?
5. ¿Cada cuánto tiempo se realiza la lectura?

---

# 7. Práctica 1 — Controlar un LED desde Flet

Desarrollar una interfaz en Flet que permita controlar un LED conectado a la Raspberry Pi Pico 2 W.

La interfaz deberá permitir:

* Encender el LED.
* Apagar el LED.
* Mostrar visualmente su estado.

Una posible interfaz:

```text
┌─────────────────────────────┐
│       CONTROL DEL LED       │
│                             │
│        LED APAGADO          │
│                             │
│   [ ENCENDER ] [ APAGAR ]   │
└─────────────────────────────┘
```

### Preguntas

1. ¿Qué componente controla físicamente el LED?
2. ¿Qué tópico debe utilizar Flet?
3. ¿Qué mensaje permite encender el LED?
4. ¿Qué mensaje permite apagarlo?

---

# 8. Práctica 2 — Leer el estado de un botón desde Flet

Conectar un botón a la Raspberry Pi Pico 2 W.

Utilizar `GPIOIn` para leer su estado y visualizarlo en Flet.

En esta práctica utilizaremos:

```text
0 → puerta cerrada
1 → puerta abierta
```

La interfaz podría mostrar:

```text
┌─────────────────────────────┐
│       PUERTA 1              │
│                             │
│       CERRADA               │
│                             │
└─────────────────────────────┘
```

Cuando el botón cambie:

```text
┌─────────────────────────────┐
│       PUERTA 1              │
│                             │
│       ABIERTA               │
│                             │
└─────────────────────────────┘
```

### Flujo de información

```text
Botón
  │
  ▼
GPIO
  │
  ▼
GPIOIn
  │
  │ publish
  ▼
MQTT / PubSub
  │
  ▼
Flet
```

---

# 9. Antes del receptor IR

Hasta ahora hemos trabajado con señales digitales relativamente sencillas:

```text
0 ────────────────
1 ────────────────
```

Un control remoto infrarrojo funciona de una manera diferente.

Para entender la clase `IRIn`, primero debemos conocer algunos conceptos básicos:

* el receptor infrarrojo;
* la portadora de aproximadamente 38 kHz;
* la información codificada en pulsos;
* la PIO de la Raspberry Pi Pico.

---

# 10. El control remoto infrarrojo

Un control remoto IR utiliza un LED infrarrojo para transmitir información.

Cuando presionamos un botón, el control genera una secuencia de señales infrarrojas.

El receptor IR recibe esta señal y la convierte en una señal eléctrica que podemos conectar a un GPIO.

De forma simplificada:

```text
Control remoto
      │
      │ luz infrarroja
      ▼
Receptor IR
      │
      │ señal eléctrica
      ▼
GPIO
      │
      ▼
Raspberry Pi Pico
```

---

# 11. ¿Por qué 38 kHz?

Los controles remotos infrarrojos normalmente no mantienen el LED infrarrojo simplemente encendido.

La señal utiliza una frecuencia comúnmente alrededor de:

```text
38 kHz
```

Esto significa que la luz infraroja titila aproximadamente 38.000 veces por segundo.



```text
Frecuencia de 38 kHz de luz infraroja
 
< ON = titila >< OFF = apagado > 
 _   _   _   _  
| | | | | | | | 
| |_| |_| |_| |________________


Salida del sensor
               _______________
______________|
< ON = titila >< OFF = apagado >
```

La información se transmite haciendo que esta portadora aparezca o desaparezca durante determinados intervalos de tiempo.

Por eso el receptor IR no solamente nos interesa como un simple `0` o `1`.

También necesitamos analizar **cuánto tiempo permanece una señal en determinado estado**.

---

# 12. El sensor/receptor IR

El receptor infrarrojo se encarga de detectar la señal infrarroja y entregar una señal digital al microcontrolador.

Por tanto, desde el punto de vista del Pico, podemos verlo como:

```text
              Receptor IR
                   │
                   ▼
                 GPIO
                   │
                   ▼
             señal digital
```

Pero esa señal contiene información temporal.

Por ejemplo:

```text
      OFF    ON OFF0 ON  OFF1   ON  OFF1  ON  OFF_end
───────────┐   ┌───┐   ┌──────┐   ┌──────┐   ┌────────────────
           └───┘   └───┘      └───┘      └───┘
                <->     <---->                <---------->
              tiempo0   tiempo1                tiempo_end
                
                0         1          1        transmitió 3 bits
```

Las duraciones de OFF  permiten reconstruir los bits transmitidos por el control.

---
## Conexión del sensor IR

  Conecta un sensor IR de la siguiente manera:



| Sensor IR | * Raspberry Pico[](https://www.google.com/search?q=Raspberry+Pi+PICO+sc0915&ibp=oshop&pvorigin=29&prds=catalogid:3280890652002175913,productid:17115033010239354734,imageDocid:5612685213992860087,gpcid:12240176666452404847,pvt:hg,pvo:29,headlineOfferDocid:12177881442601087307) |
|---|---|
| Vout | GP22 |
| GND | GND |
| Vcc | 3V3 |

--------

 |




![](https://encrypted-tbn1.gstatic.com/images?q=tbn:ANd9GcR0ADKR9wr3Msnd2jKeTfac1uEzShcGHMm2ct3kw2UMo6EBmR0h) 
---

# 13. PIO — Programmable I/O

La Raspberry Pi Pico dispone de un periférico denominado:

**PIO — Programmable Input/Output**

La PIO permite procesar señales de entrada y salida con un control temporal muy preciso, utilizando máquinas de estado independientes del procesamiento normal del programa.

En este taller no vamos a aprender a programar directamente una máquina PIO.

Solamente necesitamos comprender su función:

```text
GPIO
 │
 │ señal con información temporal
 ▼
PIO
 │
 │ eventos y duraciones
 ▼
IRIn
 │
 │ código IR
 ▼
Aplicación
```

La PIO resulta especialmente útil en este caso porque necesitamos detectar cambios de la señal y medir sus duraciones.

---

# 14. Clase `IRIn`

Ahora podemos introducir la clase `IRIn`.

`IRIn` encapsula la complejidad de recibir y procesar la señal del receptor infrarrojo.


```python
iimport rp2
from machine import Pin

from task import Task

class IRIn(Task):

    END = 0
    
    @rp2.asm_pio(set_init=rp2.PIO.OUT_LOW)
    def count1():

        # =====================================================
        # Y = on threshold
        # =====================================================

        pull(block)
        mov(y, osr)

        # =====================================================
        # Estado inicial
        # =====================================================

        jmp(pin, "on_off")

        # =====================================================
        # on
        # =====================================================

        label("off_on")

        mov(x, y)

        label("on_LOOP")

        # -----------------------------------------------------
        # Decrementamos X
        # -----------------------------------------------------

        jmp(x_dec, "on_DUMMY") #1

        
        # -----------------------------------------------------
        # Permanecemos en on hasta que aparezca off
        # -----------------------------------------------------

        label("on_SLEEP")

        jmp(pin, "on_off")
        jmp("on_SLEEP")


        # -----------------------------------------------------
        # on todavía no terminó
        # -----------------------------------------------------

        label("on_DUMMY") 

        # ¿Terminó on porque apareció off?
        jmp(pin, "on_END") #2

        # Padding
        nop()[6]           #3

        jmp("on_LOOP")     #4


        # -----------------------------------------------------
        # on ya terminó
        # -----------------------------------------------------

        label("on_END")

        mov(isr, invert(x))#
        push(noblock)
        irq(rel(0))

        jmp("on_off")


        # =====================================================
        # on → off
        # =====================================================

        label("on_off")

        # X = 0xFFFFFFFF
        mov(x, y)


        # =====================================================
        # off
        # =====================================================

        label("off_LOOP")

        # Mientras siga off seguimos contando
        jmp(x_dec, "off_DUMMY") #1

        mov(isr, null)
        push(noblock)
        irq(rel(0))

        # Si pasa on_THRESHOLD_US esperamos el cero

        label("off_SLEEP")
        jmp(pin,"off_SLEEP")
        jmp("off_on")

        label("off_DUMMY")

        nop()[7]             #2

        # ¿Seguimos off?
        jmp(pin, "off_LOOP")  #3


        # -----------------------------------------------------
        # off → on
        #
        # X contiene el contador restante.
        # Lo enviamos directamente.
        #
        # Al interpretarlo como signed32 será negativo,
        # por lo que Python puede distinguirlo de off.
        # -----------------------------------------------------

        mov(isr, x)#
        push(noblock)
        irq(rel(0))
        jmp("off_on")
        

    def __init__(
        self,
        scheduler,
        pubsub,
        pin_ir,
        sm=0,
        off0_threshold_us=1100,
        off1_threshold_us=3000,
        on_threshold_us=20000,
        pio_freq=10_000_000,
    ):
        """
        IR receiver driver.

        PIO events:

            positive  -> ON duration
            negative  -> OFF duration
            0         -> END OF FRAME

        The code is constructed using only OFF durations.

        OFF < off0_threshold_us
            -> bit 0

        OFF >= off0_threshold_us
            -> bit 1
        """
        self.pubsub=pubsub
        super().__init__(scheduler, period_ms=100)
        self.new_code = False

        self.off0_threshold_us = off0_threshold_us
        self.off1_threshold_us = off1_threshold_us
        self.on_threshold_us = on_threshold_us

        self.code = 0
        self.n_bits = 0

        self.sm = rp2.StateMachine(
            sm,
            self.count1,
            freq=pio_freq,
            jmp_pin=Pin(pin_ir, Pin.IN, Pin.PULL_UP)
        )
        self.sm.irq(handler=self._irq_handler)

        self.sm.active(1)

        # Threshold used by the PIO to detect END.
        self.sm.put(on_threshold_us)


    def _irq_handler(self, sm):

        while sm.rx_fifo():

            raw = sm.get()

            if raw == 0:
                # END
                self.last_code = self.code
                self.last_bits = self.n_bits

                self.code = 0
                self.n_bits = 0

                self.new_code = True
                continue

            elif raw & 0x8000_0000:
                continue
            else:
                value = self.on_threshold_us-raw
                if 0<value < self.off0_threshold_us:
                    bit = 0

                elif value < self.off1_threshold_us:
                    bit = 1
                else:
                    print('IRIn._irq_handler Valor fuera de rango',raw,value,self.code,self.n_bits)
                    continue
                
                self.code = (self.code << 1) | bit
                self.n_bits += 1
             
                
 
            
    def update(self):
        #print('.',end='')

        if not self.new_code:
            return

        code = {"value":self.last_code}
        bits = self.last_bits

        self.new_code = False

        # Publicar aquí
        self.pubsub.publish("IRIn/value",code)
        print(code)




if __name__ == "__main__":
    from watchdog_task import WatchdogTask
    from scheduler import Scheduler
    from wifi_manager import WiFiManager
    from node import Node
    from pubsub_mqtt import PubSubMQTT



    SSID="Ejemplo" #  Change to your WiFi
    PSW_FILE=".env" # File name with password
    MQTT_BROKER="broker.hivemq.com"
    NODE_NAME='emb_node_0'
    PREFIX='UDFJC/iot_ws/robot0/'
    IR_GPIO=22

    with open(PSW_FILE) as f:
        password = f.read().strip()

    scheduler = Scheduler()
    print('Scheduler')
    wifi = WiFiManager(ssid=SSID, password=password) 
    node = Node(prefix=PREFIX, node_name=NODE_NAME)
    PubSubMQTT(client_id=NODE_NAME, broker=MQTT_BROKER,  scheduler=scheduler, node=node, period_ms=100, prefix=PREFIX)
    WatchdogTask(scheduler=scheduler, pubsub=node, wifi=wifi, period_ms=9000)
    print('Initialized')

    ir = IRIn(
        scheduler=scheduler,
        pubsub=node,
        pin_ir=IR_GPIO,
    )
    
#     def handle_ir_reader_value(topic, msg):
#         print("handle_ir_reader_value",msg)
#     node.subscribe("IRIn/value",handle_ir_reader_value )
            


    scheduler.run()





```

La clase recibe eventos generados por la PIO y utiliza las duraciones de los pulsos para construir el código recibido. 



---

# 15. De pulsos a código

La clase `IRIn` procesa principalmente las duraciones `OFF`.

De acuerdo con la implementación utilizada:

```text
OFF < 1100 μs
       ↓
      bit 0

1100 μs ≤ OFF < 2000 μs
       ↓
      bit 1
```

Una duración `OFF` mayor se interpreta como una señal que no debe incorporarse al código, por ejemplo una condición de inicio, repetición u otra señal.

La clase va construyendo el código:

```text
pulsos
   ↓
bits
   ↓
secuencia binaria
   ↓
código entero
```

Cuando detecta el final de una trama, devuelve el código completo.

---

# 16. Práctica 3 — Leer un control remoto IR desde Flet

Conectar un receptor IR a la Raspberry Pi Pico 2 W.

Desarrollar una interfaz Flet que permita visualizar los códigos recibidos.

Una posible interfaz:

```text
┌─────────────────────────────────┐
│          CONTROL IR             │
│                                 │
│   Último código: 0x45           │
│                                 │
│   Historial                     │
│   ─────────────────────────      │
│   0x45                          │
│   0x46                          │
│   0x47                          │
│   0x15                          │
└─────────────────────────────────┘
```

Presionar diferentes botones del control y registrar los códigos obtenidos.


Los códigos deben determinarse experimentalmente con el control utilizado.

---

# 17. Taller integrador — Sistema de control de acceso y alarma

Ahora integraremos los tres componentes estudiados:

```text
GPIOOut
GPIOIn
IRIn
```

El objetivo es construir un sistema de control de acceso utilizando:

* Raspberry Pi Pico 2 W;
* un botón;
* un LED;
* un receptor IR;
* un control remoto;
* Flet.

---

# 18. Componentes del sistema

```text
                     Raspberry Pi Pico 2 W
                    ┌──────────────────────┐
                    │                      │
     Botón ─────────┤ GPIOIn               │
                    │                      │
     LED ◄──────────┤ GPIOOut              │
                    │                      │
     IR ────────────┤ IRIn                 │
                    │                      │
                    └──────────┬───────────┘
                               │
                              Wi-Fi
                               │
                               ▼
                             Flet
```

---

# 19. Sensor de puerta

El botón representa el estado de la Puerta 1.

Utilizaremos:

```text
0 → puerta cerrada
1 → puerta abierta
```

Por tanto:

```text
GPIOIn
   │
   ├── 0 → CERRADA
   │
   └── 1 → ABIERTA
```

Flet deberá mostrar este estado.

---

# 20. Indicador de alarma

El LED representa el estado de la alarma.

```text
LED apagado → alarma desactivada
LED encendido → alarma activada
```

Por tanto, `GPIOOut` será utilizado para controlar el LED.

```text
Flet
  │
  ▼
GPIOOut
  │
  ▼
 LED
```

---

# 21. Activación y desactivación mediante IR

El control remoto se utilizará para introducir una contraseña.

Por ejemplo:

```text
1 → 2 → 3 → 4
```

Los códigos reales de los botones deberán determinarse previamente utilizando la práctica de `IRIn`.

El sistema deberá:

1. Recibir un código IR.
2. Identificar el botón correspondiente.
3. Agregarlo a la contraseña introducida.
4. Comparar la contraseña con la contraseña configurada.
5. Activar o desactivar la alarma si la contraseña es correcta.

---

# 22. Detección de intrusión

Cuando la alarma esté activa, la apertura de la puerta deberá disparar la alarma.

La condición puede expresarse como:

```python
alarma_activa == True and puerta_abierta == True
```

El flujo será:

```text
Alarma activa
      │
      +
Puerta abierta
      │
      ▼
   INTRUSIÓN
      │
      ▼
    ALARMA
```

---

# 23. Contraseña incorrecta

Si el usuario introduce una contraseña incorrecta, también deberá dispararse la alarma.

```text
Control IR
    │
    ▼
Contraseña
    │
    ├──── correcta ────► Activar / desactivar
    │
    └──── incorrecta ──► ALARMA
```

La interfaz deberá informar del evento.

---

# 24. Simulación de la alarma en Flet

La alarma deberá poder visualizarse y/o escucharse desde Flet.

Por ejemplo:

```text
┌─────────────────────────────────┐
│                                 │
│        ⚠️ ALARMA                │
│                                 │
│       ¡INTRUSIÓN!               │
│                                 │
│       PUERTA 1 ABIERTA          │
│                                 │
└─────────────────────────────────┘
```

La interfaz puede utilizar:

* cambio de color;
* iconos;
* animaciones;
* sonido;
* mensajes de alerta.

---


#  Preguntas para el informe

1. ¿Qué función cumple la librería `machine`?
2. ¿Cuál es la diferencia entre `Pin.IN` y `Pin.OUT`?
3. ¿Qué función cumple `GPIOIn`?
4. ¿Qué función cumple `GPIOOut`?
5. ¿Qué diferencia existe entre leer un botón y recibir un código IR?
6. ¿Qué función cumple la portadora de aproximadamente 38 kHz?
7. ¿Qué función cumple el receptor IR?
8. ¿Por qué la señal IR requiere analizar tiempos y no solamente estados `0` y `1`?
9. ¿Qué es la PIO?
10. ¿Por qué resulta útil la PIO para el receptor IR?
11. ¿Qué función cumple `IRIn`?
12. ¿Cómo se construye un código IR a partir de los pulsos recibidos?
13. ¿Qué diferencia existe entre `GPIOIn`/`GPIOOut` y `IRIn`?
14. ¿Cómo se comunica la Raspberry Pi Pico 2 W con Flet?
15. ¿Qué condiciones hacen que se dispare la alarma?
16. ¿Cómo organizaría el sistema mediante una máquina de estados?

---

#  Resumen

Durante el taller se construye progresivamente el siguiente modelo:

```text
                  HARDWARE
                     │
          ┌──────────┼───────────┐
          │          │           │
        Botón       LED      Receptor IR
          │          │           │
          ▼          ▲           ▼
       GPIOIn     GPIOOut       IRIn
          │          │           │
          │          │           │
          └──────────┼───────────┘
                     │
                  PubSub
                     │
                     ▼
                    Flet
```

La idea fundamental del taller es pasar de la manipulación directa de un GPIO:

```python
Pin(...)
```

a componentes reutilizables:

```text
GPIOIn
GPIOOut
IRIn
```

y finalmente integrar estos componentes para construir un sistema IoT completo.

```
```
