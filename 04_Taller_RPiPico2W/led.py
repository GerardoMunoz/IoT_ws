import json
from machine import Pin


class LED:

    def __init__(self, pubsub, gpio):
        """
        gpio: string que identifica el GPIO.
              Ejemplo: "GP0", "GP1", "GP25"

        El LED se controla mediante el tópico:
              led/<gpio>

        Payload esperado:
              {"value": 1}
              {"value": 0}
        """

        self.pubsub = pubsub
        self.gpio = gpio

        # Extraer número del GPIO
        pin_number = int(gpio.replace("GP", ""))

        self.pin = Pin(pin_number, Pin.OUT)

        # Inicialmente apagado
        self.pin.value(0)

        # Suscripción
        self.topic = "led/" + gpio
        print("LED subscribe",self.topic)
        self.pubsub.subscribe(self.topic, self._callback)


    def _callback(self, topic, msg):
        print("LED calllback:", topic, msg,type(msg))
        try:
#             print("LED calllback 0")
#             data = json.loads(msg)
#             print("LED calllback 1")
            value = msg.get("value")
            print("LED calllback v",value,type(value))
            if value == 1:
                self.pin.value(1)

            elif value == 0:
                self.pin.value(0)

        except Exception as e:
            print("LED error:", e)


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
    LED(node, "GP0")


    scheduler.run()

# 1. Publicar
# 2. Suscribirse
# 0. Salir
# Opción: 1
# Topic: UDFJC/iot_ws/robot0/led/GP0
# Payload: {"value":1}
# 
# 1. Publicar
# 2. Suscribirse
# 0. Salir
# Opción: 1
# Topic: UDFJC/iot_ws/robot0/led/GP0
# Payload: {"value":0}