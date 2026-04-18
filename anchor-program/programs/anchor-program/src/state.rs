use anchor_lang::prelude::*;
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum PolicyType {
    Crop,
    Flood,
    Both,
}
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum PolicyStatus {
    Active,
    PaidOut,
    Expired,
}
#[account]
pub struct InsurancePolicy {
    pub farmer:            Pubkey,
    pub policy_type:       PolicyType,
    pub status:            PolicyStatus,
    pub premium_paid:      u64,
    pub coverage_amount:   u64,
    pub trigger_threshold: i64,
    pub region_id:         String,
    pub created_at:        i64,
    pub expires_at:        i64,
    pub duration_days:     u16,
    pub bump:              u8,
}
impl InsurancePolicy {
    pub const LEN: usize = 8
        + 32
        + 1
        + 1
        + 8
        + 8
        + 8
        + (4 + 32)
        + 8
        + 8
        + 2
        + 1;
}
#[account]
pub struct OracleData {
    pub authority:      Pubkey,
    pub region_id:      String,
    pub rainfall_mm:    i64,
    pub flood_level_cm: i64,
    pub last_updated:   i64,
    pub bump:           u8,
}
impl OracleData {
    pub const LEN: usize = 8
        + 32
        + (4 + 32)
        + 8
        + 8
        + 8
        + 1;
}
#[account]
pub struct ProgramTreasury {
    pub authority: Pubkey,
    pub bump:      u8,
}
impl ProgramTreasury {
    pub const LEN: usize = 8 + 32 + 1;
}
