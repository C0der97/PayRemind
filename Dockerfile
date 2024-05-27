# Usar una imagen base de Node.js
FROM node:latest

# Establecer el directorio de trabajo
WORKDIR /usr/src/app-ionic

# Copiar el package.json y el package-lock.json (si existe)
COPY package*.json ./

# Instalar las dependencias del proyecto
RUN npm install --legacy-peer-deps --force

# Instalar Angular CLI e Ionic CLI globalmente
RUN npm install -g @angular/cli @ionic/cli --legacy-peer-deps

# Copiar todo el código del proyecto en el contenedor
COPY . .

# Exponer el puerto en el que correrá la aplicación
EXPOSE 8100

# Comando por defecto al iniciar el contenedor
CMD ["ionic", "serve", "--host", "0.0.0.0"]
