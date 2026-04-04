diesel::table! {
    users (id) {
        id -> Uuid,
        email -> Text,
        created_at -> Timestamptz,
        first_name -> Nullable<Text>,
        last_name -> Nullable<Text>,
        nickname -> Nullable<Text>,
        birth_date -> Nullable<Date>,
        profile_type -> Text,
        cref_number -> Nullable<Text>,
        cref_verified -> Bool,
        avatar_url -> Nullable<Text>,
        avatar_crop -> Nullable<Jsonb>,
        social_links -> Jsonb,
    }
}

diesel::table! {
    training_plans (id) {
        id -> Uuid,
        user_id -> Uuid,
        name -> Text,
        description -> Nullable<Text>,
        created_at -> Timestamptz,
    }
}

diesel::table! {
    exercises (id) {
        id -> Uuid,
        name -> Text,
        muscle_group -> Text,
        sets -> Int4,
        reps_target -> Text,
        rest_seconds -> Int4,
        notes -> Nullable<Text>,
        order_index -> Int4,
        exercise_type -> Text,
        plan_id -> Uuid,
    }
}

diesel::table! {
    workout_sessions (id) {
        id -> Uuid,
        user_id -> Uuid,
        started_at -> Timestamptz,
        finished_at -> Nullable<Timestamptz>,
        notes -> Nullable<Text>,
        ai_feedback -> Nullable<Text>,
        plan_id -> Nullable<Uuid>,
    }
}

diesel::table! {
    session_logs (id) {
        id -> Uuid,
        session_id -> Uuid,
        exercise_id -> Nullable<Uuid>,
        exercise_name -> Text,
        set_number -> Int4,
        weight_kg -> Nullable<Numeric>,
        reps -> Nullable<Int4>,
        logged_at -> Timestamptz,
        duration_min -> Nullable<Int4>,
        distance_km -> Nullable<Numeric>,
    }
}

diesel::table! {
    refresh_tokens (id) {
        id -> Uuid,
        user_id -> Uuid,
        token -> Text,
        expires_at -> Timestamptz,
        created_at -> Timestamptz,
    }
}

diesel::table! {
    catalog_exercises (id) {
        id -> Uuid,
        user_id -> Nullable<Uuid>,
        name -> Text,
        category -> Text,
        exercise_type -> Text,
        created_at -> Timestamptz,
    }
}

diesel::joinable!(refresh_tokens -> users (user_id));
diesel::joinable!(training_plans -> users (user_id));
diesel::joinable!(exercises -> training_plans (plan_id));
diesel::joinable!(workout_sessions -> users (user_id));
diesel::joinable!(session_logs -> workout_sessions (session_id));
diesel::joinable!(catalog_exercises -> users (user_id));

diesel::allow_tables_to_appear_in_same_query!(
    users,
    refresh_tokens,
    training_plans,
    exercises,
    workout_sessions,
    session_logs,
    catalog_exercises,
);
