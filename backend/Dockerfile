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
RUN touch src/main.rs && cargo build --release

FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y libpq5 ca-certificates && rm -rf /var/lib/apt/lists/* \
    && useradd --create-home appuser

COPY --from=builder /app/target/release/gym-tracker-backend /usr/local/bin/gym-tracker-backend

USER appuser

ENV SERVER_HOST=0.0.0.0
ENV SERVER_PORT=8080
EXPOSE 8080

CMD ["gym-tracker-backend"]
