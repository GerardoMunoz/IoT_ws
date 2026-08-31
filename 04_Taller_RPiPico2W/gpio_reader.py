from machine import Pin
from task import Task


class GPIOReader(Task):

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

              gpio/<gpio>

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
        self.topic = "gpio/" + gpio

        print("GPIOReader initialized", self.topic)

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
            "GPIOReader:",
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
    GPIOReader(scheduler,node, "GP16")


    scheduler.run()
