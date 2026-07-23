FROM postgres:16

# Default values (can be overridden at runtime)
ENV POSTGRES_USER=hackathon
ENV POSTGRES_PASSWORD=hackathon
ENV POSTGRES_DB=hackathon_analytics

# Copy initialization scripts
COPY init/ /docker-entrypoint-initdb.d/

# PostgreSQL listens on 5432
EXPOSE 5432