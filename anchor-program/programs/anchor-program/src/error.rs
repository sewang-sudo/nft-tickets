use anchor_lang::prelude::*;
#[error_code]
pub enum ThaharError {
    #[msg("Policy is not in active status")]
    PolicyNotActive,
    #[msg("Trigger threshold has not been breached")]
    ThresholdNotBreached,
    #[msg("Premium amount is too low")]
    PremiumTooLow,
    #[msg("Coverage amount must be greater than zero")]
    InvalidCoverageAmount,
    #[msg("Region ID exceeds maximum length")]
    RegionIdTooLong,
    #[msg("Oracle data is stale - not updated recently")]
    OracleDataStale,
    #[msg("Unauthorized oracle authority")]
    UnauthorizedOracle,
    #[msg("Policy already paid out")]
    AlreadyPaidOut,
    #[msg("Arithmetic overflow")]
    ArithmeticOverflow,
    #[msg("Duration must be between 30 and 365 days")]
    InvalidDuration,
    #[msg("Cannot cancel policy in the final month")]
    CannotCancelFinalMonth,
    #[msg("Policy has not expired yet")]
    PolicyNotExpired,
    #[msg("Policy must be at least 7 days old before triggering payout")]
    PolicyTooNew,
}