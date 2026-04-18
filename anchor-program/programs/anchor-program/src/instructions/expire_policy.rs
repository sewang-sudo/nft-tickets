use anchor_lang::prelude::*;
use crate::state::{InsurancePolicy, PolicyStatus, ProgramTreasury};
use crate::error::ThaharError;

#[derive(Accounts)]
pub struct ExpirePolicy<'info> {
    #[account(
        mut,
        seeds = [b"policy", farmer.key().as_ref()],
        bump = policy.bump,
    )]
    pub policy: Account<'info, InsurancePolicy>,
    #[account(
        mut,
        seeds = [b"treasury"],
        bump = treasury.bump
    )]
    pub treasury: Account<'info, ProgramTreasury>,
    /// CHECK: farmer receives the refund
    #[account(mut, address = policy.farmer)]
    pub farmer: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

pub fn handle_expire_policy(ctx: Context<ExpirePolicy>) -> Result<()> {
    let policy = &ctx.accounts.policy;
    let farmer = &ctx.accounts.farmer;
    let treasury = &ctx.accounts.treasury;

    let now = Clock::get()?.unix_timestamp;

    require!(now >= policy.expires_at, ThaharError::PolicyNotExpired);
    require!(policy.status == PolicyStatus::Active, ThaharError::PolicyNotActive);

    // Return 50% of premium to farmer
    if policy.premium_paid > 0 {
        let refund = policy.premium_paid / 2;
        **treasury.to_account_info().try_borrow_mut_lamports()? -= refund;
        **farmer.to_account_info().try_borrow_mut_lamports()? += refund;
        msg!("Auto-expired: refunded {} lamports to farmer", refund);
    }

    // Return rent to farmer
    let policy_lamports = policy.to_account_info().lamports();
    **policy.to_account_info().try_borrow_mut_lamports()? -= policy_lamports;
    **farmer.to_account_info().try_borrow_mut_lamports()? += policy_lamports;

    // Zero out account
    policy.to_account_info().data.borrow_mut().fill(0);
    msg!("Policy auto-expired for farmer: {:?}", farmer.key());
    Ok(())
}
