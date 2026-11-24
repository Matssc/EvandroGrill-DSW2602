# Etapa 1: compila o Spring Boot com o Maven (o resultado é um .jar)
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY EvandrosGrill/pom.xml ./
COPY EvandrosGrill/src ./src
# O cache guarda as dependências baixadas, então o segundo build é bem mais rápido.
# Os testes ficam de fora porque precisam do MySQL rodando.
RUN --mount=type=cache,target=/root/.m2 mvn -B -DskipTests package

# Etapa 2: só o Java pra rodar o .jar
FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
# Banco, segredo do token e usuário inicial vêm das variáveis do deploy/docker-compose.yaml
ENTRYPOINT ["java", "-jar", "app.jar"]
