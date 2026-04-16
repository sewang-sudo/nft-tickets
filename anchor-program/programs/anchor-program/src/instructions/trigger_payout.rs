use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::state::{InsurancePolicy, PolicyStatus, OracleData, ProgramTreasury};
use crate::error::ThaharError;

#[derive(Accounts)]
pub struct TriggerPayout<'info> {
    #[account(
        mut,
        seeds = [b"policy", farmer.key().as_ref()],
        bump = policy.bump,
        has_one = farmer
    )]
    pub policy: Account<'info, InsurancePolicy>,
    #[account(
        seeds = [b"oracle", oracle.region_id.as_bytes()],
        bump = oracle.bump
    )]
    pub oracle: Account<'info, OracleData>,
    #[account(
        mut,
        seeds = [b"treasury"],
        bump = treasury.bump
    )]
    pub treasury: Account<'info, ProgramTreasury>,
    /// CHECK: verified by policy.farmer constraint above
    #[account(mut, address = policy.farmer)]
    pub farmer: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<TriggerPayout>) -> Result<()> {
    // --- read-only checks first, before any mutable borrows ---
    let payout = {
        let policy = &ctx.accounts.policy;
        let oracle = &ctx.accounts.oracle;

        require!(
            policy.status == PolicyStatus::Active,
            ThaharError::PolicyNotActive
        );

        let now = Clock::get()?.unix_timestamp;
        require!(
            now - oracle.last_updated < 86400,
            ThaharError::OracleDataStale
        );

        require!(
            oracle.rainfall_mm < policy.trigger_threshold,
            ThaharError::ThresholdNotBreached
        );

        policy.coverage_amount
    };

    // --- CPI to System Program to transfer from treasury PDA to farmer ---
    let treasury_bump = ctx.accounts.treasury.bump;
    let seeds: &[&[u8]] = &[b"treasury", &[treasury_bump]];
    let signer_seeds = &[seeds];

    let cpi_ctx = CpiContext::new_with_signer(
        ctx.accounts.system_program.key(),
        system_program::Transfer {
            from: ctx.accounts.treasury.to_account_info(),
            to:   ctx.accounts.farmer.to_account_info(),
        },
        signer_seeds,
    );
    system_program::transfer(cpi_ctx, payout)?;

    // --- mark policy as paid out ---
    let policy = &mut ctx.accounts.policy;
    policy.status = PolicyStatus::PaidOut;

    msg!("Payout triggered! {} lamports to farmer {:?}", payout, policy.farmer);
    Ok(())
}
