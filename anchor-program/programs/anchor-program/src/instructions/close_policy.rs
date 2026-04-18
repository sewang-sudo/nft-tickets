use anchor_lang::prelude::*;
use crate::state::{InsurancePolicy, PolicyStatus, ProgramTreasury};

#[derive(Accounts)]
pub struct ClosePolicy<'info> {
    #[account(
        mut,
        seeds = [b"policy", farmer.key().as_ref()],
        bump = policy.bump,
        has_one = farmer,
    )]
    pub policy: Account<'info, InsurancePolicy>,
    #[account(
        mut,
        seeds = [b"treasury"],
        bump = treasury.bump
    )]
    pub treasury: Account<'info, ProgramTreasury>,
    #[account(mut)]
    pub farmer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn handle_close_policy(ctx: Context<ClosePolicy>) -> Result<()> {
    let policy = &ctx.accounts.policy;
    let farmer = &ctx.accounts.farmer;
    let treasury = &ctx.accounts.treasury;

    // If policy is still Active (no payout), return 50% of premium from treasury
    if policy.status == PolicyStatus::Active && policy.premium_paid > 0 {
        let refund = policy.premium_paid / 2;
        **treasury.to_account_info().try_borrow_mut_lamports()? -= refund;
        **farmer.to_account_info().try_borrow_mut_lamports()? += refund;
        msg!("Refunded 50% premium: {} lamports to farmer", refund);
    }

    // Return rent from policy account to farmer
    let policy_lamports = policy.to_account_info().lamports();
    **policy.to_account_info().try_borrow_mut_lamports()? -= policy_lamports;
    **farmer.to_account_info().try_borrow_mut_lamports()? += policy_lamports;

    // Zero out account data
    policy.to_account_info().data.borrow_mut().fill(0);
    msg!("Policy closed for farmer: {:?}", farmer.key());
    Ok(())
}
