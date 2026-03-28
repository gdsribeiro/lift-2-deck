FROM rust:1.88 AS builder

WORKDIR /app

# Install libpq for diesel postgres
RUN apt-get update && apt-get install -y libpq-dev && rm -rf /var/lib/apt/lists/*

# Cache dependencies
COPY Cargo.toml Cargo.lock* ./
RUN mkdir src && echo "fn main() {}" > src/main.rs
RUN cargo build --release 2>/dev/null || true
RUN rm -rf src

# Build actual app
COPY . .
RUN cargo build --release

FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y libpq5 libpq-dev ca-certificates postgresql-client && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/target/release/gym-tracker-backend /usr/local/bin/gym-tracker-backend
COPY --from=builder /app/migrations /app/migrations
COPY --from=builder /app/diesel.toml /app/diesel.toml
COPY --from=builder /app/run-migrations.sh /app/run-migrations.sh

ENV SERVER_HOST=0.0.0.0
ENV SERVER_PORT=8080
EXPOSE 8080

WORKDIR /app
ENTRYPOINT ["/app/run-migrations.sh"]
CMD ["gym-tracker-backend"]
