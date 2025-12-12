# Используем официальный образ Next.js (он включает всё нужное)
FROM node:20-bullseye

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Генерируем стили Tailwind и строим Next.js
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]

