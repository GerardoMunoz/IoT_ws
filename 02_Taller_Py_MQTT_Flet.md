# Taller de Internet de las Cosas
# Laboratorio 1 - Robot Control Center

**Duración:** 2 horas

## Objetivos

Al finalizar esta práctica el estudiante será capaz de:

- Crear un proyecto profesional en Python.
- Utilizar un entorno virtual.
- Construir un cliente MQTT.
- Publicar mensajes.
- Suscribirse a tópicos.
- Comprender el modelo Publish/Subscribe.

---

# Parte 1. Buenas prácticas para programar en Python

Antes de escribir una sola línea de código, estableceremos las reglas del curso.

## 1.1 Nombres descriptivos

❌ Incorrecto

```python
a = 10
b = 20
```

✅ Correcto

```python
temperature = 10
motor_peed = 20
```

## 1.2 Uso de constantes
Python no tiene constantes reales a nivel de lenguaje (como const en JavaScript o final en Java). El uso de mayúsculas es solo una convención para avisar a otros programadores que ese valor no debe ser modificado.
Nunca escribir valores "mágicos".

Es el lugar estándar para las constantes globales del script o módulo es después de las importaciones.

* Uso: Valores que no cambian en todo el programa (configuraciones, URLs, constantes matemáticas).
* Nomenclatura: Siempre en mayúsculas con guiones bajos (UPPER_CASE).
* Ejemplo:
```python
import os

# CONSTANTES AL INICIO DEL ARCHIVO
DATABASE_URL = "localhost:5432"
MAX_RETRIES = 5

def conectar_base_datos():
    print(f"Conectando a {DATABASE_URL}...")

```

---

## 1.3 Archivo de configuración

Toda configuración deberá estar en

```
config.py
```

Ejemplo

```python
BROKER = "broker.hivemq.com"
PORT = 1883
TOPIC = "robot/demo"
```

---

## 1.4 Type Hint

Todas las funciones deberán indicar tipos.

```python
def publish(topic: str, payload: str) -> None:
    ...
```


```python
# Una lista que solo contiene strings
nombres: list[str] = ["Ana", "Carlos", "Luis"]

# Un diccionario con claves string y valores enteros
edades: dict[str, int] = {"Ana": 25, "Carlos": 30}

```


```python
# Una lista donde cada elemento es un diccionario
usuarios: list[dict[str, str]] = [
    {"nombre": "Ana", "rol": "admin"},
    {"nombre": "Carlos", "rol": "usuario"}
]

```


```py   thon
from typing import Any

# Un objeto JSON típico (Diccionario con claves string y valores de cualquier tipo)
configuracion_json: dict[str, Any] = {
    "url": "https://ejemplo.com",
    "puerto": 8080,
    "activo": True,
    "tags": ["prod", "aws"]
}

```


---

## 1.5 Dataclass

Cuando un objeto almacene información ...

```python
class Message:
    def __init__(self, topic: str, payload: str):
        self.topic = topic
        self.payload = payload
```

con el decorador `@dataclass` se puede ahorrar escribir el constructor y los métodos para imprimir y comparar.

```python
@dataclass
class Message:
    topic: str
    payload: str
```

---

## 1.6 Separar UI de la lógica

Separar la interfaz de usuario (UI) de la lógica consiste en dividir el diseño visual de un programa del código que procesa los datos. La UI solo muestra información y captura clics, mientras que la lógica calcula, valida y decide qué hacer.

Por qué es importante.

* *Facilidad de mantenimiento*: Cambiar el diseño visual no romperá las reglas de negocio del programa.
* *Código reutilizable*: La misma lógica puede servir para una app móvil, web o de consola.
* *Pruebas simples*: Permite probar los cálculos matemáticos o bases de datos sin abrir pantallas.
* *Trabajo en equipo*: Los diseñadores modifican la interfaz mientras los programadores mejoran el backend.

---

## 1.7 Modularización  del proyecto

La *modularización* es la técnica de diseño de software que consiste en dividir un programa en partes más pequeñas, independientes y especializadas 

* Método (o Función): Cuando necesitas procesar datos, calcular algo o ejecutar un paso específico. Debe cumplir el principio de responsabilidad única: *"si hace dos cosas distintas, se debe dividir en dos métodos"*.

* Clase: Cuando necesitas agrupar datos (atributos) junto con las acciones (métodos) que operan sobre esos datos (ej. una clase Usuario que guarda nombre/email y tiene el método cambiar_password()).

* Archivo (Módulo): Cuando un conjunto de funciones y clases resuelven un problema unificado (ej. autenticacion.py dentro de la carpeta de lógica, o boton_personalizado.py en la interfaz).

* Carpeta (Paquete): Cuando tienes varios archivos que comparten un mismo propósito general (ej. una carpeta controllers para la lógica, views para las pantallas, o database para el almacenamiento).




## 1.8 Crear el entorno virtual

Crear

```bash
python -m venv .venv
```

Activar

Windows

```bash
.venv\Scripts\activate
```

Linux

```bash
source .venv/bin/activate
```

Instalar

```bash
pip install flet

pip install paho-mqtt
```

Guardar dependencias

```bash
pip freeze > requirements.txt
```


---

# Parte 2. MQTT

## Documentación

¿Qué es MQTT?

Modelo Publish / Subscribe.

---

## Tópicos

Ejemplos

```
cultivo/invernadero_1/rosas/sensor/temperatura
cultivo/invernadero_1/rosas/sensor/humedad_suelo
cultivo/invernadero_1/rosas/actuador/riego
cultivo/invernadero_1/girasoles/sensor/temperatura
cultivo/invernadero_2/orquideas/sensor/luminosidad
cultivo/invernadero_2/orquideas/actuador/ventilador
```

---

## Comodines

```text
'+', '#'
```

Ejemplos

```text
cultivo/+/+/sensor/temperatura
cultivo/+/+/actuador/+
cultivo/invernadero_1/#
cultivo/+/orquideas/#
```

---

## Instalar

```bash
pip install paho-mqtt
```
---


## Cliente

```python
mqtt.Client()
```

---

## Métodos

```
connect()

publish()

subscribe()

loop_start()
```

---

## Callbacks

```
on_connect()

on_message()
```

---



---

# Ejemplo

```python
import time
import paho.mqtt.client as mqtt


# --------------------------------------------------
# Funciones MQTT
# --------------------------------------------------

def on_connect(
    client: mqtt.Client,
    userdata: object,
    flags: dict,
    reason_code: mqtt.ReasonCode,
    properties: mqtt.Properties | None
) -> None:
    """Se ejecuta cuando el cliente se conecta al broker."""
    if reason_code == 0:
        print("\nConectado correctamente al broker.")
    else:
        print(f"\nError de conexión. Código: {reason_code}")


def on_message(
    client: mqtt.Client,
    userdata: object,
    message: mqtt.MQTTMessage
) -> None:
    """Se ejecuta cada vez que llega un mensaje."""
    payload = message.payload.decode("utf-8")

    print("\n--- Mensaje recibido ---")
    print(f"Topic: {message.topic}")
    print(f"Longitud: {len(message.payload)} bytes")
    print(f"Payload: {payload}")
    print("------------------------")


def main() -> None:

    broker: str = input("Broker [broker.hivemq.com]: ") or "broker.hivemq.com"
    port: int = int(input("Puerto [1883]: ") or 1883)

    client = mqtt.Client(
        mqtt.CallbackAPIVersion.VERSION2
    )

    client.on_connect = on_connect
    client.on_message = on_message

    client.connect(broker, port, 60)
    client.loop_start()

    while True:

        print("\n1. Publicar")
        print("2. Suscribirse")
        print("0. Salir")

        option: str = input("Opción: ")

        if option == "1":

            topic: str = input("Topic: ")
            payload: str = input("Payload: ")

            client.publish(topic, payload)

        elif option == "2":

            topic: str = input("Topic: ")

            client.subscribe(topic)

            print(f"Suscrito a {topic}")

        elif option == "0":
            break

    client.loop_stop()
    client.disconnect()


if __name__ == "__main__":
    main()

```



# Parte 3. Construyendo el Robot Control Center

## Documentación de Flet

Durante esta práctica únicamente utilizaremos los siguientes componentes.

| Clase | Uso |
|---------|------|
| Page | Ventana principal |
| Text | Mostrar texto |
| TextField | Entrada de texto |
| Button | Botón |
| TextField(multiline=True) | Área de texto |
| Container | Agrupar componentes |
| Row | Organización horizontal |
| Column | Organización vertical |

---

## Métodos importantes

```python
page.add()

page.update()
```

Eventos

```python
on_click

on_change
```

---

# Primera versión de la interfaz

La aplicación tendrá tres módulos.

```python
import flet as ft


def main(page: ft.Page):

    page.title = "Taller IoT"
    page.padding = 20

    # -----------------------------
    # Container 1 - Configuración
    # -----------------------------

    name_field = ft.TextField(
        label="Nombre"
    )

    name_result = ft.Text(
        "Sin configurar"
    )

    def save_name(e):
        name_result.value = (
            f"Nombre: {name_field.value}"
        )
        page.update()

    save_button = ft.Button(
        content="Guardar",
        on_click=save_name
    )

    configuration = ft.Container(
        content=ft.Column([
            ft.Text(
                "Configuración",
                size=20
            ),

            name_field,

            save_button,

            name_result
        ]),

        padding=20
    )

    # -----------------------------
    # Container 2 - Monitor
    # -----------------------------

    message_field = ft.TextField(
        label="Mensaje"
    )

    log = ft.Text(
        "LOG\n"
        "----------------\n"
        "Esperando..."
    )

    def add_message(e):
        log.value += (
            f"\n{message_field.value}"
        )
        page.update()

    add_button = ft.Button(
        content="Agregar",
        on_click=add_message
    )

    monitor = ft.Container(
        content=ft.Column([
            ft.Text(
                "Monitor",
                size=20
            ),

            message_field,

            add_button,

            log
        ]),

        padding=20
    )

    # -----------------------------
    # Container 3 - Acción
    # -----------------------------

    action_text = ft.Text(
        "Esperando acción..."
    )

    action_button = ft.Button(
        content="Ejecutar",
        on_click=lambda e: (
            setattr(
                action_text,
                "value",
                "¡Acción ejecutada!"
            ),
            page.update()
        )
    )

    action = ft.Container(
        content=ft.Column([
            ft.Text(
                "Acción",
                size=20
            ),

            action_button,

            action_text
        ]),

        padding=20
    )

    # -----------------------------
    # Agregar a la página
    # -----------------------------

    page.add(
        ft.Row([
            configuration,
            monitor,
            action
        ])
    )


ft.run(main)




```



# Taller

Construir el 'Robot Control Center' con los siguietes contenedores:


✓ para la configuración y la conexión.

✓ para suscribirse y mostrar los mensajes recibidos.

✓ para publicar el topico y el payload.




# Conclusión

Al finalizar esta práctica el Robot Control Center será capaz de:

✅ Conectarse a un Broker MQTT.

✅ Publicar mensajes.

✅ Suscribirse a tópicos.

✅ Visualizar mensajes en tiempo real.

Esta aplicación seguirá creciendo durante todo el semestre.
