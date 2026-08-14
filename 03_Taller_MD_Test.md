# Taller de Internet de las Cosas
# Laboratorio 2 - Proceso de diseño

**Duración:** 2  horas

## Objetivos

En esta clase comenzaremos a trabajar como un equipo de desarrollo de un sistema IoT.

La idea no es solamente escribir código. Vamos a practicar un proceso básico de diseño:

1. Organizar el proyecto.
2. Documentar lo que hacemos.
3. Definir una estructura de datos.
4. Implementar una función.
5. Definir qué significa que el resultado sea correcto.
6. Crear pruebas automáticas.
7. Ejecutar las pruebas automáticamente.

Al final de la clase tendremos un pequeño proyecto de Python que genera información en formato JSON y que puede comprobar automáticamente si esa información cumple las reglas definidas.

---

# 1. Organización del proyecto

Un proyecto de software debe tener una estructura que permita encontrar fácilmente cada elemento.

Una estructura inicial puede ser:

```text
iot-project/
│
├── README.md
│
├── common/
│   └── messages.py
│
├── micropython/
│   ├── main.py
│   └── mqtt.py
│
├── flet/
│   ├── main.py
│   └── mqtt.py
│
├── tests/
│   ├── common/
│   │   └── test_messages.py
│   └── integration/
│       └── test_mqtt.py
│
└── .github/
    └── workflows/
        └── tests.yml
````



---

# 2. Markdown

Markdown es un lenguaje sencillo para escribir documentación utilizando texto plano.

GitHub permite visualizar automáticamente archivos Markdown.

## Título

```markdown
# Proyecto IoT
```

## Subtítulo

```markdown
## Descripción
```

## Lista

```markdown
- Raspberry Pi Pico 2 W
- Sensor
- Motor
- LED
```

## Lista numerada

```markdown
1. Diseñar
2. Programar
3. Probar
4. Documentar
```

## Código

Se puede mostrar código utilizando tres comillas invertidas:

````markdown
```python
print("Hola IoT")
```
````

## Tabla

```markdown
| Elemento | Descripción |
|---|---|
| Pico | Controlador |
| LED | Actuador |
| Sensor | Entrada |
````

---

# 3. README.md

El archivo `README.md` debe permitir que otra persona entienda rápidamente el proyecto.

Un README inicial puede contener:

````markdown
# Proyecto IoT

## Descripción

Descripción breve del proyecto.

## Objetivo

¿Qué problema intenta solucionar?

## Hardware

- Raspberry Pi Pico 2 W
- Sensores
- Actuadores

## Software

- Python
- MQTT

## Estructura

```text
src/
tests/
docs/
```

## Cómo ejecutar

Explicar los pasos necesarios para ejecutar el programa.

## Pruebas

Explicar cómo ejecutar las pruebas.

## Estado

Indicar qué funcionalidades están terminadas y cuáles están pendientes.

````

### Idea importante

El README no es un documento que se escribe solamente al inicio o al final.

Debe evolucionar junto con el proyecto.

---

# 4. JSON

JSON significa **JavaScript Object Notation**.

Es un formato de texto utilizado para representar información estructurada.

Por ejemplo:

```json
{
  "name": "saludo",
  "speed": 10,
  "duration": 2.0
}
````

Un programa Python puede convertir estructuras de Python a JSON y viceversa.

## Diccionario de Python

```python
data = {
    "name": "saludo",
    "speed": 10
}
```


##  JSON vs. Diccionario de Python

| Característica | JSON (JavaScript Object Notation) | Diccionario de Python (dict) |
|---|---|---|
| Definición | Formato de texto ligero para intercambio de datos. | Estructura de datos nativa en memoria de Python. |
| Naturaleza | Es siempre una cadena de texto (string). | Es un objeto mutable en memoria. |
| Comillas | Obligatoriamente comillas dobles ("key"). | Permite comillas simples o dobles ('key' o "key"). |
| Booleanos | Se escriben en minúscula (`true`, `false`). | Se escriben con mayúscula inicial (`True`, `False`). |
| Valor Nulo | Se representa como `null`. | Se representa como `None`. |
| Tipos de Claves | Solo cadenas de texto (string). | Cualquier objeto inmutable (strings, números, tuplas). |
| Comentarios | No los permite por estándar. | Permite comentarios usando #. |
| Coma final (Trailing comma) | No la permite (rompe el formato y da error). | Sí la permite (es una buena práctica al saltar de línea). |
| Uso Principal | Transmisión de datos entre cliente y servidor. | Procesamiento y manipulación de datos en código. |


## Convertir Python a JSON

```python
import json

text = json.dumps(data)
```

## Convertir JSON a Python

```python
import json

data = json.loads(text)
```

---

# 5. Ejemplo de una función que genera un JSON

En el archivo `common/messages.py` escribimos una función que recibe información y genera una estructura que posteriormente puede convertirse en JSON.


```python
import time


def create_schedule(name: str, delay_s: float) -> dict:
    """
    Create a schedule message.

    delay_s: number of seconds to wait before execution.
    """

    now_ns = time.time_ns()
    next_exec_ns = now_ns + int(delay_s * 1_000_000_000)

    return {
        "action": "schedule",
        "name": name,
        "next_exec_epoch_s": next_exec_ns // 1_000_000_000,
        "next_exec_ns": next_exec_ns % 1_000_000_000,
    }
```

Uso:

```python
message = create_schedule("saludo", 5.5)

print(message)
```
---


# 8. Pruebas automáticas

Una prueba automática debe comprobar una condición que esperamos que se cumpla.

Utilizaremos `pytest`. Se inatala con `pip install pytest`

Para realizar una prueba sencilla hay que crear el archivo `tests/common/test_messages.py` con el siguiente contenido.

```python
import time
from common.messages import create_schedule


def test_schedule_at_specific_time():
    msg = create_schedule("test_name", 5.5)
    
    assert len(msg)==4
    assert "action" in msg
    assert "name" in msg
    assert "next_exec_epoch_s" in msg
    assert "next_exec_ns" in msg
    assert msg["action"] == "schedule"
    assert msg["name"] == "test_name"
    assert isinstance(msg["next_exec_epoch_s"], int)
    assert msg["next_exec_epoch_s"] > time.time()
    assert isinstance(msg["next_exec_ns"], int)
    assert 0 <= msg["next_exec_ns"] < 1_000_000_000


```

Luego se ejecuta `python -m pytest`

Si la condición es verdadera:

```text
PASSED
```

Si es falsa:

```text
FAILED
```

---
