use actix_web::{HttpResponse, ResponseError};
use serde::Serialize;
use std::fmt;

#[derive(Debug)]
pub enum AppError {
    NotFound(String),
    Unauthorized,
    BadRequest(String),
    DatabaseError(String),
    ExternalServiceError(String),
    InternalError(String),
}

#[derive(Serialize)]
struct ErrorResponse {
    error: ErrorBody,
}

#[derive(Serialize)]
struct ErrorBody {
    code: String,
    message: String,
}

impl fmt::Display for AppError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            AppError::NotFound(msg) => write!(f, "Not found: {msg}"),
            AppError::Unauthorized => write!(f, "Unauthorized"),
            AppError::BadRequest(msg) => write!(f, "Bad request: {msg}"),
            AppError::DatabaseError(msg) => write!(f, "Database error: {msg}"),
            AppError::ExternalServiceError(msg) => write!(f, "External service error: {msg}"),
            AppError::InternalError(msg) => write!(f, "Internal error: {msg}"),
        }
    }
}

impl ResponseError for AppError {
    fn error_response(&self) -> HttpResponse {
        let (status, code, message) = match self {
            AppError::NotFound(msg) => {
                (actix_web::http::StatusCode::NOT_FOUND, "NOT_FOUND", msg.clone())
            }
            AppError::Unauthorized => (
                actix_web::http::StatusCode::UNAUTHORIZED,
                "UNAUTHORIZED",
                "Invalid or expired token".to_string(),
            ),
            AppError::BadRequest(msg) => {
                (actix_web::http::StatusCode::BAD_REQUEST, "BAD_REQUEST", msg.clone())
            }
            AppError::DatabaseError(_) => (
                actix_web::http::StatusCode::INTERNAL_SERVER_ERROR,
                "INTERNAL_ERROR",
                "An internal error occurred".to_string(),
            ),
            AppError::ExternalServiceError(_) => (
                actix_web::http::StatusCode::BAD_GATEWAY,
                "EXTERNAL_SERVICE_ERROR",
                "External service unavailable".to_string(),
            ),
            AppError::InternalError(_) => (
                actix_web::http::StatusCode::INTERNAL_SERVER_ERROR,
                "INTERNAL_ERROR",
                "An internal error occurred".to_string(),
            ),
        };

        HttpResponse::build(status).json(ErrorResponse {
            error: ErrorBody {
                code: code.to_string(),
                message,
            },
        })
    }
}

impl From<diesel::result::Error> for AppError {
    fn from(err: diesel::result::Error) -> Self {
        match err {
            diesel::result::Error::NotFound => AppError::NotFound("Resource not found".to_string()),
            _ => AppError::DatabaseError(err.to_string()),
        }
    }
}
