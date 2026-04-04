use diesel::PgConnection;
use rand::Rng;

use crate::errors::AppError;

use super::repository;

const ADJECTIVES: &[&str] = &[
    "Iron", "Steel", "Power", "Ultra", "Apex", "Titan", "Brave", "Swift",
    "Primal", "Epic", "Noble", "Fierce", "Solid", "Prime", "Alpha", "Bold",
    "Rapid", "Storm", "Blaze", "Hyper", "Turbo", "Mega", "Grand", "Stark",
    "Elite", "Peak", "Vital", "Grit", "Forge", "Fury",
];

const NOUNS: &[&str] = &[
    "Lifter", "Crusher", "Beast", "Titan", "Force", "Warrior", "Runner",
    "Hammer", "Falcon", "Phoenix", "Panther", "Wolf", "Bull", "Hawk",
    "Thunder", "Viper", "Cobra", "Atlas", "Spartan", "Viking", "Knight",
    "Ninja", "Dragon", "Bear", "Lion", "Tiger", "Eagle", "Shark", "Rex",
    "Ox",
];

fn generate_candidate() -> String {
    let mut rng = rand::thread_rng();
    let adj = ADJECTIVES[rng.gen_range(0..ADJECTIVES.len())];
    let noun = NOUNS[rng.gen_range(0..NOUNS.len())];
    let number: u16 = rng.gen_range(1000..10000);
    format!("{adj}{noun}#{number:04}")
}

pub fn generate_unique(conn: &mut PgConnection) -> Result<String, AppError> {
    for _ in 0..10 {
        let candidate = generate_candidate();
        if !repository::is_nickname_taken(conn, &candidate)? {
            return Ok(candidate);
        }
    }
    Err(AppError::InternalError(
        "Could not generate unique nickname".to_string(),
    ))
}
