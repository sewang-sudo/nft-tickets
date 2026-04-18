use anchor_lang::prelude::*;
use crate::state::{InsurancePolicy, PolicyType, PolicyStatus};
use crate::error::ThaharError;

#[derive(Accounts)]
#[instruction(policy_type: PolicyType, coverage_amount: u64, trigger_threshold: i64, region_id: String, duration_days: u16)]
pub struct RegisterPolicy<'info> {
    #[account(
        init,
        payer = farmer,
        space = InsurancePolicy::LEN,
        seeds = [b"policy", farmer.key().as_ref()],
        bump
    )]
    pub policy: Account<'info, InsurancePolicy>,
    #[account(mut)]
    pub farmer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn handle_register_policy(
    ctx: Context<RegisterPolicy>,
    policy_type: PolicyType,
    coverage_amount: u64,
    trigger_threshold: i64,
    region_id: String,
    duration_days: u16,
) -> Result<()> {
    require!(coverage_amount > 0, ThaharError::InvalidCoverageAmount);
    require!(region_id.len() <= 32, ThaharError::RegionIdTooLong);
    require!(duration_days >= 30, ThaharError::InvalidDuration);
    require!(duration_days <= 365, ThaharError::InvalidDuration);

    let now = Clock::get()?.unix_timestamp;
    let policy = &mut ctx.accounts.policy;
    policy.farmer            = ctx.accounts.farmer.key();
    policy.policy_type       = policy_type;
    policy.status            = PolicyStatus::Active;
    policy.premium_paid      = 0;
    policy.coverage_amount   = coverage_amount;
    policy.trigger_threshold = trigger_threshold;
    policy.region_id         = region_id;
    policy.created_at        = now;
    policy.expires_at        = now + (duration_days as i64 * 86400);
    policy.duration_days     = duration_days;
    policy.bump              = ctx.bumps.policy;
    msg!("Policy registered for farmer: {:?}", policy.farmer);
    Ok(())
}
