mod auth;
mod cardio;
mod config;
mod db;
mod errors;
mod evolution;
mod exercises;
mod groq;
mod history;
mod plans;
mod schema;
mod series;
mod sessions;

use actix_cors::Cors;
use actix_web::{middleware::Logger, web, App, HttpServer};
use actix_web_httpauth::middleware::HttpAuthentication;

use auth::middleware::jwt_validator;
use auth::supabase::SupabaseClient;
use config::{AuthMode, Config};

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    dotenvy::dotenv().ok();
    env_logger::init();

    let config = Config::from_env();
    let pool = db::create_pool(&config.database_url);
    let groq_client = groq::client::GroqClient::new(config.groq_api_key.clone());
    let jwt_secret = config.jwt_secret.clone();
    let auth_mode = config.auth_mode.clone();
    let frontend_origin = config.frontend_origin.clone();
    let bind_addr = format!("{}:{}", config.server_host, config.server_port);

    let supabase: Option<SupabaseClient> = match auth_mode {
        AuthMode::Supabase => Some(SupabaseClient::new(
            config.supabase_url.clone().unwrap(),
            config.supabase_service_key.clone().unwrap(),
        )),
        AuthMode::Local => {
            println!("Running in LOCAL auth mode (Supabase bypassed)");
            None
        }
    };

    println!("Starting server at {bind_addr}");

    HttpServer::new(move || {
        let cors = Cors::default()
            .allowed_origin(&frontend_origin)
            .allowed_methods(vec!["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"])
            .allowed_headers(vec!["Authorization", "Content-Type"])
            .supports_credentials()
            .max_age(3600);

        let auth_middleware = HttpAuthentication::bearer(jwt_validator);

        let mut app = App::new()
            .wrap(Logger::default())
            .wrap(cors)
            .app_data(web::Data::new(pool.clone()))
            .app_data(web::Data::new(jwt_secret.clone()))
            .app_data(web::Data::new(auth_mode.clone()))
            .app_data(web::Data::new(groq_client.clone()));

        if let Some(ref client) = supabase {
            app = app.app_data(web::Data::new(client.clone()));
        }

        app
            // Public routes
            .service(
                web::scope("/api/v1/auth")
                    .route("/register", web::post().to(auth::handlers::register))
                    .route("/login", web::post().to(auth::handlers::login))
                    .route("/refresh", web::post().to(auth::handlers::refresh))
                    .route("/logout", web::post().to(auth::handlers::logout)),
            )
            // Protected routes
            .service(
                web::scope("/api/v1")
                    .wrap(auth_middleware)
                    .route("/auth/me", web::get().to(auth::handlers::me))
                    // Plans
                    .route("/plans", web::get().to(plans::handlers::list))
                    .route("/plans", web::post().to(plans::handlers::create))
                    .route("/plans/{id}", web::get().to(plans::handlers::get_detail))
                    .route("/plans/{id}", web::put().to(plans::handlers::update))
                    .route("/plans/{id}", web::delete().to(plans::handlers::delete))
                    // Series (static routes before dynamic)
                    .route("/series/reorder", web::patch().to(series::handlers::reorder))
                    .route("/plans/{plan_id}/series", web::post().to(series::handlers::create))
                    .route("/series/{id}", web::put().to(series::handlers::update))
                    .route("/series/{id}", web::delete().to(series::handlers::delete))
                    // Exercises (static routes before dynamic)
                    .route("/exercises/reorder", web::patch().to(exercises::handlers::reorder))
                    .route("/series/{series_id}/exercises", web::post().to(exercises::handlers::create))
                    .route("/exercises/{id}", web::put().to(exercises::handlers::update))
                    .route("/exercises/{id}", web::delete().to(exercises::handlers::delete))
                    // Sessions
                    .route("/sessions", web::post().to(sessions::handlers::start))
                    .route("/sessions/active", web::get().to(sessions::handlers::get_active))
                    .route("/sessions/{id}/logs", web::post().to(sessions::handlers::log_set))
                    .route("/sessions/{session_id}/logs/{log_id}", web::delete().to(sessions::handlers::delete_log))
                    .route("/sessions/{id}/finish", web::patch().to(sessions::handlers::finish))
                    // History
                    .route("/history", web::get().to(history::handlers::list))
                    .route("/history/{session_id}", web::get().to(history::handlers::detail))
                    // Evolution
                    .route("/evolution", web::get().to(evolution::handlers::get_evolution))
                    // Cardio
                    .route("/cardio", web::get().to(cardio::handlers::list))
                    .route("/cardio", web::post().to(cardio::handlers::create))
                    .route("/cardio/{id}", web::delete().to(cardio::handlers::delete)),
            )
    })
    .bind(&bind_addr)?
    .run()
    .await
}
