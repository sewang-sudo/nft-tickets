use anchor_lang::prelude::*;
use crate::state::OracleData;
use crate::error::ThaharError;

#[derive(Accounts)]
#[instruction(region_id: String, rainfall_mm: i64, flood_level_cm: i64)]
pub struct UpdateOracle<'info> {
    #[account(
        init_if_needed,
        payer = authority,
        space = OracleData::LEN,
        seeds = [b"oracle", region_id.as_bytes()],
        bump
    )]
    pub oracle: Account<'info, OracleData>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handle_update_oracle(
    ctx: Context<UpdateOracle>,
    region_id: String,
    rainfall_mm: i64,
    flood_level_cm: i64,
) -> Result<()> {
    let oracle = &mut ctx.accounts.oracle;

    if oracle.authority == Pubkey::default() {
        oracle.authority  = ctx.accounts.authority.key();
        oracle.region_id  = region_id;
        oracle.bump       = ctx.bumps.oracle;
    } else {
        require!(
            oracle.authority == ctx.accounts.authority.key(),
            ThaharError::UnauthorizedOracle
        );
    }

    oracle.rainfall_mm    = rainfall_mm;
    oracle.flood_level_cm = flood_level_cm;
    oracle.last_updated   = Clock::get()?.unix_timestamp;

    msg!("Oracle updated — rainfall: {}mm, flood: {}cm", rainfall_mm, flood_level_cm);
    Ok(())
}
