use anchor_lang::prelude::*;
use crate::state::ProgramTreasury;

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = ProgramTreasury::LEN,
        seeds = [b"treasury"],
        bump
    )]
    pub treasury: Account<'info, ProgramTreasury>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handle_initialize(ctx: Context<Initialize>) -> Result<()> {
    let treasury = &mut ctx.accounts.treasury;
    treasury.authority = ctx.accounts.authority.key();
    treasury.bump = ctx.bumps.treasury;
    msg!("Thahar Protocol initialized. Treasury: {:?}", treasury.key());
    Ok(())
}
