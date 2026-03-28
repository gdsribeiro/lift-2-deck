use std::env;

#[derive(Clone, PartialEq)]
pub enum AuthMode {
    Local,
    Supabase,
}

pub struct Config {
    pub database_url: String,
    pub auth_mode: AuthMode,
    pub supabase_url: Option<String>,
    pub supabase_service_key: Option<String>,
    pub jwt_secret: String,
    pub groq_api_key: String,
    pub frontend_origin: String,
    pub server_host: String,
    pub server_port: u16,
}

impl Config {
    pub fn from_env() -> Self {
        let auth_mode = match env::var("AUTH_MODE").unwrap_or_else(|_| "supabase".to_string()).as_str() {
            "local" => AuthMode::Local,
            _ => AuthMode::Supabase,
        };

        let supabase_url = env::var("SUPABASE_URL").ok();
        let supabase_service_key = env::var("SUPABASE_SERVICE_KEY").ok();

        if auth_mode == AuthMode::Supabase {
            if supabase_url.is_none() || supabase_service_key.is_none() {
                panic!("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set when AUTH_MODE=supabase");
            }
        }

        Self {
            database_url: env::var("DATABASE_URL").expect("DATABASE_URL must be set"),
            auth_mode,
            supabase_url,
            supabase_service_key,
            jwt_secret: env::var("JWT_SECRET").expect("JWT_SECRET must be set"),
            groq_api_key: env::var("GROQ_API_KEY").unwrap_or_default(),
            frontend_origin: env::var("FRONTEND_ORIGIN")
                .unwrap_or_else(|_| "http://localhost:5173".to_string()),
            server_host: env::var("SERVER_HOST").unwrap_or_else(|_| "127.0.0.1".to_string()),
            server_port: env::var("SERVER_PORT")
                .unwrap_or_else(|_| "8080".to_string())
                .parse()
                .expect("SERVER_PORT must be a valid port"),
        }
    }
}
