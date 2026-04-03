use actix_web::{dev::ServiceRequest, Error, HttpMessage};
use actix_web_httpauth::extractors::bearer::BearerAuth;
use jsonwebtoken::{decode, DecodingKey, Validation};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::errors::AppError;

const JWT_ISSUER: &str = "liftdeck";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Claims {
    pub sub: Uuid,
    pub email: String,
    pub iss: String,
    pub exp: u64,
}

#[derive(Debug, Clone)]
pub struct AuthenticatedUser {
    pub user_id: Uuid,
    pub email: String,
}

pub async fn jwt_validator(
    req: ServiceRequest,
    credentials: BearerAuth,
) -> Result<ServiceRequest, (Error, ServiceRequest)> {
    let jwt_secret = req
        .app_data::<actix_web::web::Data<String>>()
        .map(|s| s.get_ref().clone())
        .unwrap_or_default();

    let token = credentials.token();

    let mut validation = Validation::default();
    validation.set_issuer(&[JWT_ISSUER]);

    match decode::<Claims>(
        token,
        &DecodingKey::from_secret(jwt_secret.as_bytes()),
        &validation,
    ) {
        Ok(token_data) => {
            let user = AuthenticatedUser {
                user_id: token_data.claims.sub,
                email: token_data.claims.email,
            };
            req.extensions_mut().insert(user);
            Ok(req)
        }
        Err(_) => Err((AppError::Unauthorized.into(), req)),
    }
}

pub fn generate_jwt(user_id: Uuid, email: &str, secret: &str) -> Result<(String, u64), AppError> {
    let expires_in = 3600u64; // 1 hour
    let exp = jsonwebtoken::get_current_timestamp() + expires_in;

    let claims = Claims {
        sub: user_id,
        email: email.to_string(),
        iss: JWT_ISSUER.to_string(),
        exp,
    };

    let token = jsonwebtoken::encode(
        &jsonwebtoken::Header::default(),
        &claims,
        &jsonwebtoken::EncodingKey::from_secret(secret.as_bytes()),
    )
    .map_err(|e| AppError::InternalError(e.to_string()))?;

    Ok((token, expires_in))
}

pub fn generate_refresh_token() -> String {
    Uuid::new_v4().to_string()
}
