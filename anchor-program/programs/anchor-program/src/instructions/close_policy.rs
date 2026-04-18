use anchor_lang::prelude::*;
use crate::state::{InsurancePolicy, PolicyStatus, ProgramTreasury};
use crate::error::ThaharError;

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

    let now = Clock::get()?.unix_timestamp;
    let days_active = (now - policy.created_at) / 86400;
    let _days_total = policy.duration_days as i64;
    let days_remaining = policy.expires_at - now;
    let one_month = 30i64 * 86400;

    if policy.status == PolicyStatus::Active && policy.premium_paid > 0 {
        // Final month — no cancel allowed
        if days_remaining <= one_month && now < policy.expires_at {
            return Err(ThaharError::CannotCancelFinalMonth.into());
        }

        let refund = if now >= policy.expires_at {
            // Policy expired naturally — 50% back
            msg!("Policy expired — refunding 50% premium");
            policy.premium_paid / 2
        } else if days_active <= 30 {
            // Lock period — 0% back
            msg!("Lock period — no refund");
            0
        } else {
            // Mid policy — 70% back
            msg!("Mid-policy cancel — refunding 70% premium");
            policy.premium_paid * 70 / 100
        };

        if refund > 0 {
            **treasury.to_account_info().try_borrow_mut_lamports()? -= refund;
            **farmer.to_account_info().try_borrow_mut_lamports()? += refund;
            msg!("Refunded {} lamports to farmer", refund);
        }
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
