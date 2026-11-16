FROM node:22-alpine
WORKDIR /app
COPY . .
ENV HOST=0.0.0.0
ENV PORT=8017
EXPOSE 8017
USER node
CMD ["npm", "start"]
