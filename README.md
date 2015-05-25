

###Подготовка
MongoDB и Redis запущены на стандартных портах

*Популяция Mongo данными - node scripts/populate_data.js
*Запуск сервера VK-api - node scripts/vk-api.js, default port - 3001
*Запуск клиента VK-api - node scripts/client.js, default port - 3000

###Проверка
curl --data "template=Halo, %B%! Wie gehts?" 127.0.0.1:3000/send

###Логирование
app.log
