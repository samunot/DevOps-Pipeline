FROM maven:3.5.2 as builder
COPY iTrust2-v2-master.zip /
RUN unzip iTrust2-v2-master.zip
WORKDIR /iTrust2-v2-master/iTrust2
RUN mvn dependency:resolve
ENV JDBC_URL=jdbc:mysql://mysql:3306/iTrust2?createDatabaseIfNotExist=true
ENV JDBC_USER=root
ENV JDBC_PASS=password_for_test
RUN echo "url $JDBC_URL">src/main/java/db.properties
RUN echo "username $JDBC_USER">>src/main/java/db.properties
RUN echo "password $JDBC_PASS">>src/main/java/db.properties
RUN echo "hibernate.connection.url=$JDBC_URL">src/main/resources/hibernate.properties
RUN echo "hibernate.connection.username=$JDBC_USER">>src/main/resources/hibernate.properties
RUN echo "hibernate.connection.password=$JDBC_PASS">>src/main/resources/hibernate.properties
RUN cp src/main/java/email.properties.template src/main/java/email.properties
RUN mvn compile
#CMD ["mvn", "jetty:run"]
RUN mvn war:war

FROM tomcat:9-jre8
COPY --from=builder /iTrust2-v2-master/iTrust2/target/iTrust2.war /usr/local/tomcat/webapps/
