# Proyecto segundo corte: Coreografía&nbsp;

&nbsp;

## Objetivo

El robot debe permitir cargar una secuencia de pasos y ejecutarla en el momento establecido sincronizado con su gemelo virtual.

## Evaluaciones

1. Control del Carrobot con tópicos (ver [motionTopics.md](motionTopics.md)).  
2. Realizar interfaz amigable en el PC para enviar tópicos.&nbsp;&nbsp;  
3. Realizar línea recta y 1/4 de círculo según se solicita.  
4. Ubicar el brazo en los ángulos asignados, con la demora asignada.  
5. Mostrar en el OLED la información del Watchdog, scroll controlado por el potenciómetro  
6. Recibir la secuencia de comandos y ejecutar la coreografía según su gemelo virtual&nbsp;
 * https://gerardomunoz.github.io/IoT_ws/coreografia/PubSub_client_web.html
 * Como mínimo debe realizar la coreografía propuesta [even.json](even.json) o [odd.json](odd.json), según si el número de su robot es par ([even.json](even.json)) o impar ([odd.json](odd.json)). Pueden ignorar `"alpha0_deg"`.


No olvide que el número de su robot tiene 2 dígitos: `f"robot{grupo_materia}{grupo_proyecto}"`. El `grupo_materia` es `1` para la clase del lunes y `3`para la clase del martes.
