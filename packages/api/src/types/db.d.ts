import type { ColumnType } from "kysely";

interface BaseTable {
	id: ColumnType<string>;
	created_at: ColumnType<Date>;
	updated_at: ColumnType<Date>;
}

interface Users extends BaseTable {
	email: ColumnType<string>;
    username: ColumnType<string>;
	full_name?: ColumnType<string | null>;
	profile_picture_url?: ColumnType<string | null>;
    role: ColumnType<string>;
    hash: ColumnType<string>;
    salt: ColumnType<string>;
	is_active: ColumnType<boolean>;
    is_deleted: ColumnType<boolean>;
	last_login?: ColumnType<Date | null>;
}

interface Sessions extends BaseTable {
    user_id: ColumnType<string>;
    claim_token: ColumnType<string>;
    last_claimed_at?: ColumnType<Date | null>;
    expires_at: ColumnType<Date>;
    is_active: ColumnType<boolean>;
}

interface Anomalies extends BaseTable {
    anomaly_type: ColumnType<'ip_ratelimited' | 'user_login_ratelimited'>;
    user_id?: ColumnType<string | null>;
    ip_address?: ColumnType<string | null>;
}

export interface Database {
	users: Users;
    sessions: Sessions;
    anomalies: Anomalies;
}