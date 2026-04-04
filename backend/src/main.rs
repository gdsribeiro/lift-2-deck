mod auth;
mod catalog;
mod config;
mod dashboard;
mod db;
mod errors;
mod evolution;
mod exercises;
mod groq;
mod history;
mod plans;
mod profile;
mod schema;
mod sessions;

use actix_cors::Cors;
use actix_governor::{Governor, GovernorConfigBuilder};
use actix_web::{middleware::{DefaultHeaders, Logger}, web, App, HttpServer};
use actix_web_httpauth::middleware::HttpAuthentication;

use auth::handlers::CookieConfig;
use auth::middleware::jwt_validator;
use auth::supabase::SupabaseClient;
use config::Config;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    dotenvy::dotenv().ok();
    env_logger::init();

    let config = Config::from_env();
    let pool = db::create_pool(&config.database_url);
    let groq_client = groq::client::GroqClient::new(config.groq_api_key.clone());
    let jwt_secret = config.jwt_secret.clone();
    let frontend_origin = config.frontend_origin.clone();
    let bind_addr = format!("{}:{}", config.server_host, config.server_port);

    let supabase = SupabaseClient::new(
        config.supabase_url.clone(),
        config.supabase_service_key.clone(),
    );

    let cookie_config = CookieConfig {
        secure: config.cookie_secure,
        same_site: if config.cookie_cross_site {
            actix_web::cookie::SameSite::None
        } else {
            actix_web::cookie::SameSite::Lax
        },
    };

    // Rate limit: 5 requests per minute per IP on auth endpoints
    let auth_rate_limit = GovernorConfigBuilder::default()
        .seconds_per_request(12)
        .burst_size(5)
        .finish()
        .expect("Failed to create rate limiter");

    // FIX-05: Rate limiting for avatar upload
    let avatar_rate_limit = GovernorConfigBuilder::default()
        .seconds_per_request(20)
        .burst_size(3)
        .finish()
        .expect("Failed to create avatar rate limiter");

    println!("Starting server at {bind_addr}");

    HttpServer::new(move || {
        let cors = Cors::default()
            .allowed_origin(&frontend_origin)
            .allowed_methods(vec!["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"])
            .allowed_headers(vec!["Authorization", "Content-Type"])
            .supports_credentials()
            .max_age(3600);

        let auth_middleware = HttpAuthentication::bearer(jwt_validator);

        App::new()
            .wrap(Logger::default())
            .wrap(
                DefaultHeaders::new()
                    .add(("X-Content-Type-Options", "nosniff"))
                    .add(("X-Frame-Options", "DENY"))
            )
            .wrap(cors)
            .app_data(web::Data::new(pool.clone()))
            .app_data(web::Data::new(jwt_secret.clone()))
            .app_data(web::Data::new(supabase.clone()))
            .app_data(web::Data::new(groq_client.clone()))
            .app_data(web::Data::new(cookie_config.clone()))
            // Public auth routes (rate limited: 5 req/min per IP)
            .service(
                web::resource("/api/v1/auth/register")
                    .wrap(Governor::new(&auth_rate_limit))
                    .route(web::post().to(auth::handlers::register))
            )
            .service(
                web::resource("/api/v1/auth/login")
                    .wrap(Governor::new(&auth_rate_limit))
                    .route(web::post().to(auth::handlers::login))
            )
            .service(
                web::resource("/api/v1/auth/refresh")
                    .wrap(Governor::new(&auth_rate_limit))
                    .route(web::post().to(auth::handlers::refresh))
            )
            .route("/api/v1/auth/logout", web::post().to(auth::handlers::logout))
            .route("/api/v1/profile/nickname/suggest", web::get().to(profile::handlers::suggest_nickname))
            // Protected routes
            .service(
                web::scope("/api/v1")
                    .wrap(auth_middleware)
                    .route("/auth/me", web::get().to(auth::handlers::me))
                    .route("/auth/email", web::put().to(auth::handlers::update_email))
                    .route("/auth/account", web::delete().to(auth::handlers::delete_account))
                    // Profile
                    .route("/profile", web::get().to(profile::handlers::get_profile))
                    .route("/profile", web::put().to(profile::handlers::update_profile))
                    .route("/profile/crop", web::put().to(profile::handlers::update_avatar_crop))
                    .service(
                        web::resource("/profile/avatar")
                            .wrap(Governor::new(&avatar_rate_limit))
                            .route(web::post().to(profile::handlers::upload_avatar))
                    )
                    // Dashboard
                    .route("/dashboard/stats", web::get().to(dashboard::handlers::get_stats))
                    .route("/dashboard/score", web::get().to(dashboard::handlers::get_score))
                    // Catalog
                    .route("/catalog", web::get().to(catalog::handlers::list))
                    .route("/catalog", web::post().to(catalog::handlers::create))
                    .route("/catalog/{id}", web::delete().to(catalog::handlers::delete))
                    // Plans
                    .route("/plans", web::get().to(plans::handlers::list))
                    .route("/plans", web::post().to(plans::handlers::create))
                    .route("/plans/{id}", web::get().to(plans::handlers::get_detail))
                    .route("/plans/{id}", web::put().to(plans::handlers::update))
                    .route("/plans/{id}", web::delete().to(plans::handlers::delete))
                    // Exercises
                    .route("/exercises/reorder", web::patch().to(exercises::handlers::reorder))
                    .route("/plans/{plan_id}/exercises", web::post().to(exercises::handlers::create))
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
                    .route("/evolution", web::get().to(evolution::handlers::get_evolution)),
            )
    })
    .bind(&bind_addr)?
    .run()
    .await
}
