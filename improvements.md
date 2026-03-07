# AI Improvement Log

**Final expert model**: v24_harvest_readiness  
**Improvements adopted**: 7/30  
**Tournament format**: depth=2, 20 games per round (10×2p, 5×3p, 5×4p)  

## Summary Table

| Round | Name | Baseline Avg VP | Challenger Avg VP | Δ | Result |
|------:|------|----------------:|------------------:|--:|--------|
| 1 | v01_center_bias | 36.2 | 37.1 | +0.9 | ✅ Adopted |
| 2 | v02_large_tree_value | 37.4 | 34.5 | -2.9 | ❌ Rejected |
| 3 | v03_vp_pressure | 37.3 | 37.8 | +0.4 | ✅ Adopted |
| 4 | v04_lp_urgency | 31.6 | 36.0 | +4.4 | ✅ Adopted |
| 5 | v05_opp_discount | 32.6 | 32.0 | -0.6 | ❌ Rejected |
| 6 | v06_medium_value | 32.2 | 29.4 | -2.9 | ❌ Rejected |
| 7 | v07_area_control | 32.6 | 30.8 | -1.8 | ❌ Rejected |
| 8 | v08_lp_next_turn | 32.9 | 34.6 | +1.7 | ✅ Adopted |
| 9 | v09_steep_ring | 33.3 | 34.9 | +1.6 | ✅ Adopted |
| 10 | v10_lp_vp_conv | 34.0 | 35.8 | +1.8 | ✅ Adopted |
| 11 | v11_opp_large_penalty | 37.3 | 36.5 | -0.8 | ❌ Rejected |
| 12 | v12_opp_medium_penalty | 37.3 | 36.5 | -0.8 | ❌ Rejected |
| 13 | v13_harvest_urgency | 39.1 | 33.5 | -5.7 | ❌ Rejected |
| 14 | v14_medium_near_center | 37.3 | 36.5 | -0.8 | ❌ Rejected |
| 15 | v15_endgame_boost | 37.3 | 36.5 | -0.8 | ❌ Rejected |
| 16 | v16_even_lp_weights | 37.2 | 32.7 | -4.5 | ❌ Rejected |
| 17 | v17_seed_value | 37.0 | 29.4 | -7.6 | ❌ Rejected |
| 18 | v18_small_value | 34.4 | 34.1 | -0.4 | ❌ Rejected |
| 19 | v19_lp_conversion_bonus | 35.6 | 33.6 | -2.0 | ❌ Rejected |
| 20 | v20_outer_ring_penalty | 37.8 | 31.7 | -6.1 | ❌ Rejected |
| 21 | v21_phase_weights | 36.2 | 35.6 | -0.7 | ❌ Rejected |
| 22 | v22_anti_shadow | 39.7 | 32.9 | -6.9 | ❌ Rejected |
| 23 | v23_rev_scaled_vp | 37.3 | 36.5 | -0.8 | ❌ Rejected |
| 24 | v24_harvest_readiness | 36.9 | 37.0 | +0.2 | ✅ Adopted |
| 25 | v25_super_center | 35.7 | 33.0 | -2.7 | ❌ Rejected |
| 26 | v26_aggressive_vp | 39.3 | 34.8 | -4.5 | ❌ Rejected |
| 27 | v27_defensive_mirror | 38.4 | 35.6 | -2.8 | ❌ Rejected |
| 28 | v28_lp_efficiency | 41.7 | 31.9 | -9.8 | ❌ Rejected |
| 29 | v29_large_tree_dominant | 39.3 | 34.8 | -4.5 | ❌ Rejected |
| 30 | v30_expert_final | 38.0 | 35.8 | -2.2 | ❌ Rejected |

## Detailed Results

### Round 1: v01_center_bias

**Change**: Center ring bonus 8→10  
**Result**: ✅ Adopted as new baseline  
**Baseline avg VP**: 36.22  
**Challenger avg VP**: 37.11  
**Δ (challenger − baseline)**: +0.88  
**Time**: 13.5s  

### Round 2: v02_large_tree_value

**Change**: Large tree piece value 10→13  
**Result**: ❌ Rejected  
**Baseline avg VP**: 37.44  
**Challenger avg VP**: 34.54  
**Δ (challenger − baseline)**: -2.91  
**Time**: 12.6s  

### Round 3: v03_vp_pressure

**Change**: VP differential weight 20→25  
**Result**: ✅ Adopted as new baseline  
**Baseline avg VP**: 37.33  
**Challenger avg VP**: 37.75  
**Δ (challenger − baseline)**: +0.42  
**Time**: 13.6s  

### Round 4: v04_lp_urgency

**Change**: Raw LP direct value 0.5→0.8  
**Result**: ✅ Adopted as new baseline  
**Baseline avg VP**: 31.63  
**Challenger avg VP**: 36.00  
**Δ (challenger − baseline)**: +4.37  
**Time**: 13.5s  

### Round 5: v05_opp_discount

**Change**: Opponent board factor 0.9→0.6 (care less about opponent board)  
**Result**: ❌ Rejected  
**Baseline avg VP**: 32.59  
**Challenger avg VP**: 31.96  
**Δ (challenger − baseline)**: -0.63  
**Time**: 14.0s  

### Round 6: v06_medium_value

**Change**: Medium tree piece value 4.5→6  
**Result**: ❌ Rejected  
**Baseline avg VP**: 32.22  
**Challenger avg VP**: 29.36  
**Δ (challenger − baseline)**: -2.87  
**Time**: 14.3s  

### Round 7: v07_area_control

**Change**: Area control bonuses: center 5→8, ring1 2.5→4  
**Result**: ❌ Rejected  
**Baseline avg VP**: 32.59  
**Challenger avg VP**: 30.75  
**Δ (challenger − baseline)**: -1.84  
**Time**: 13.7s  

### Round 8: v08_lp_next_turn

**Change**: Next-turn LP weight 5→7 (prioritise immediate LP)  
**Result**: ✅ Adopted as new baseline  
**Baseline avg VP**: 32.89  
**Challenger avg VP**: 34.61  
**Δ (challenger − baseline)**: +1.72  
**Time**: 13.3s  

### Round 9: v09_steep_ring

**Change**: Steeper ring gradient [current_0, 7, 3, 1]  
**Result**: ✅ Adopted as new baseline  
**Baseline avg VP**: 33.33  
**Challenger avg VP**: 34.89  
**Δ (challenger − baseline)**: +1.56  
**Time**: 13.2s  

### Round 10: v10_lp_vp_conv

**Change**: LP→VP conversion weight 4→6  
**Result**: ✅ Adopted as new baseline  
**Baseline avg VP**: 34.04  
**Challenger avg VP**: 35.82  
**Δ (challenger − baseline)**: +1.78  
**Time**: 14.4s  

### Round 11: v11_opp_large_penalty

**Change**: Extra penalty per opponent large tree (+15)  
**Result**: ❌ Rejected  
**Baseline avg VP**: 37.33  
**Challenger avg VP**: 36.50  
**Δ (challenger − baseline)**: -0.83  
**Time**: 14.9s  

### Round 12: v12_opp_medium_penalty

**Change**: Extra penalty per opponent medium tree (+8)  
**Result**: ❌ Rejected  
**Baseline avg VP**: 37.33  
**Challenger avg VP**: 36.50  
**Δ (challenger − baseline)**: -0.83  
**Time**: 14.9s  

### Round 13: v13_harvest_urgency

**Change**: Harvest urgency: own large trees get bonus × remaining revolutions  
**Result**: ❌ Rejected  
**Baseline avg VP**: 39.15  
**Challenger avg VP**: 33.46  
**Δ (challenger − baseline)**: -5.68  
**Time**: 13.8s  

### Round 14: v14_medium_near_center

**Change**: Bonus for own medium trees in rings 0-1 (+5)  
**Result**: ❌ Rejected  
**Baseline avg VP**: 37.33  
**Challenger avg VP**: 36.50  
**Δ (challenger − baseline)**: -0.83  
**Time**: 15.1s  

### Round 15: v15_endgame_boost

**Change**: In revolution 2+, VP weight gets +10 boost  
**Result**: ❌ Rejected  
**Baseline avg VP**: 37.33  
**Challenger avg VP**: 36.50  
**Δ (challenger − baseline)**: -0.83  
**Time**: 14.9s  

### Round 16: v16_even_lp_weights

**Change**: More uniform LP future weights [0,5,4,3,2,1]  
**Result**: ❌ Rejected  
**Baseline avg VP**: 37.22  
**Challenger avg VP**: 32.68  
**Δ (challenger − baseline)**: -4.54  
**Time**: 14.1s  

### Round 17: v17_seed_value

**Change**: Seed position value 0.4→1.0  
**Result**: ❌ Rejected  
**Baseline avg VP**: 37.04  
**Challenger avg VP**: 29.39  
**Δ (challenger − baseline)**: -7.64  
**Time**: 10.7s  

### Round 18: v18_small_value

**Change**: Small tree position value 2→3  
**Result**: ❌ Rejected  
**Baseline avg VP**: 34.44  
**Challenger avg VP**: 34.07  
**Δ (challenger − baseline)**: -0.37  
**Time**: 14.1s  

### Round 19: v19_lp_conversion_bonus

**Change**: Direct LP-to-VP conversion credit in eval (+8 per 3 LP)  
**Result**: ❌ Rejected  
**Baseline avg VP**: 35.56  
**Challenger avg VP**: 33.57  
**Δ (challenger − baseline)**: -1.98  
**Time**: 16.4s  

### Round 20: v20_outer_ring_penalty

**Change**: Outer ring bonus lowered 1→0.3 (discourage outer focus)  
**Result**: ❌ Rejected  
**Baseline avg VP**: 37.81  
**Challenger avg VP**: 31.68  
**Δ (challenger − baseline)**: -6.14  
**Time**: 14.9s  

### Round 21: v21_phase_weights

**Change**: Phase-aware: LP focus early, VP focus late (custom eval)  
**Result**: ❌ Rejected  
**Baseline avg VP**: 36.22  
**Challenger avg VP**: 35.57  
**Δ (challenger − baseline)**: -0.65  
**Time**: 15.2s  

### Round 22: v22_anti_shadow

**Change**: Anti-shadow: bonus for trees unshaded in next 3 sun positions  
**Result**: ❌ Rejected  
**Baseline avg VP**: 39.74  
**Challenger avg VP**: 32.86  
**Δ (challenger − baseline)**: -6.88  
**Time**: 17.6s  

### Round 23: v23_rev_scaled_vp

**Change**: VP weight scales +5 per revolution (15→20→25→30)  
**Result**: ❌ Rejected  
**Baseline avg VP**: 37.33  
**Challenger avg VP**: 36.50  
**Δ (challenger − baseline)**: -0.83  
**Time**: 14.9s  

### Round 24: v24_harvest_readiness

**Change**: Bonus +12 when we have large tree + 4 LP (harvest opportunity)  
**Result**: ✅ Adopted as new baseline  
**Baseline avg VP**: 36.85  
**Challenger avg VP**: 37.04  
**Δ (challenger − baseline)**: +0.18  
**Time**: 15.2s  

### Round 25: v25_super_center

**Change**: Extreme center gradient [15, 8, 4, 1]  
**Result**: ❌ Rejected  
**Baseline avg VP**: 35.67  
**Challenger avg VP**: 32.96  
**Δ (challenger − baseline)**: -2.70  
**Time**: 13.8s  

### Round 26: v26_aggressive_vp

**Change**: VP weight 25→30, large tree value +2  
**Result**: ❌ Rejected  
**Baseline avg VP**: 39.30  
**Challenger avg VP**: 34.82  
**Δ (challenger − baseline)**: -4.47  
**Time**: 14.5s  

### Round 27: v27_defensive_mirror

**Change**: Opponent board factor → 1.1 (fully mirror opponent value)  
**Result**: ❌ Rejected  
**Baseline avg VP**: 38.41  
**Challenger avg VP**: 35.57  
**Δ (challenger − baseline)**: -2.84  
**Time**: 15.1s  

### Round 28: v28_lp_efficiency

**Change**: Higher LP future weights across all offsets [0,6,4,2.5,1.5,0.8]  
**Result**: ❌ Rejected  
**Baseline avg VP**: 41.67  
**Challenger avg VP**: 31.86  
**Δ (challenger − baseline)**: -9.81  
**Time**: 15.5s  

### Round 29: v29_large_tree_dominant

**Change**: Large tree value →16, VP weight →28, opp large penalty →20  
**Result**: ❌ Rejected  
**Baseline avg VP**: 39.30  
**Challenger avg VP**: 34.82  
**Δ (challenger − baseline)**: -4.47  
**Time**: 14.5s  

### Round 30: v30_expert_final

**Change**: Expert combo: phase eval + harvest readiness + anti-shadow  
**Result**: ❌ Rejected  
**Baseline avg VP**: 37.96  
**Challenger avg VP**: 35.79  
**Δ (challenger − baseline)**: -2.18  
**Time**: 29.5s  



---

## Round 2: Experiments 31–80 (50 games each)

**Final expert model after round 2**: v65_opp_lp_penalty  
**New improvements adopted**: 1/50  
**Tournament format**: depth=2, 50 games per round (20×2p, 15×3p, 15×4p)  

### Summary Table

| Round | Name | Baseline Avg VP | Challenger Avg VP | Δ | Result |
|------:|------|----------------:|------------------:|--:|--------|
| 31 | v31_lp_direct_0_9 | 35.9 | 34.4 | -1.5 | ❌ Rejected |
| 32 | v32_lp_direct_1_0 | 35.9 | 34.4 | -1.5 | ❌ Rejected |
| 33 | v33_lp_vp_7 | 35.9 | 34.4 | -1.5 | ❌ Rejected |
| 34 | v34_lp_vp_8 | 34.9 | 34.7 | -0.2 | ❌ Rejected |
| 35 | v35_lp_future_t1_8 | 37.4 | 32.8 | -4.6 | ❌ Rejected |
| 36 | v36_lp_future_t1_9 | 37.4 | 33.3 | -4.1 | ❌ Rejected |
| 37 | v37_lp_future_t2_4 | 39.0 | 30.3 | -8.7 | ❌ Rejected |
| 38 | v38_lp_future_long_tail | 37.2 | 34.0 | -3.2 | ❌ Rejected |
| 39 | v39_lp_future_steep | 37.9 | 33.7 | -4.3 | ❌ Rejected |
| 40 | v40_lp_combo | 37.7 | 32.8 | -4.9 | ❌ Rejected |
| 41 | v41_ring0_11 | 37.2 | 35.2 | -2.0 | ❌ Rejected |
| 42 | v42_ring1_8 | 37.2 | 35.2 | -2.0 | ❌ Rejected |
| 43 | v43_ring_11_8 | 37.2 | 35.2 | -2.0 | ❌ Rejected |
| 44 | v44_ring2_4 | 35.1 | 32.5 | -2.5 | ❌ Rejected |
| 45 | v45_vp_27 | 37.2 | 35.2 | -2.0 | ❌ Rejected |
| 46 | v46_vp_23 | 37.2 | 35.2 | -2.0 | ❌ Rejected |
| 47 | v47_opp_board_1_0 | 37.2 | 35.2 | -2.0 | ❌ Rejected |
| 48 | v48_area_center_8 | 37.9 | 32.7 | -5.2 | ❌ Rejected |
| 49 | v49_area_ring1_4 | 37.3 | 34.1 | -3.2 | ❌ Rejected |
| 50 | v50_ring_area_combo | 37.9 | 32.7 | -5.2 | ❌ Rejected |
| 51 | v51_large_12 | 37.7 | 34.7 | -2.9 | ❌ Rejected |
| 52 | v52_medium_5_5 | 35.6 | 29.6 | -6.0 | ❌ Rejected |
| 53 | v53_medium_5 | 35.9 | 33.3 | -2.5 | ❌ Rejected |
| 54 | v54_small_2_5 | 38.3 | 34.7 | -3.6 | ❌ Rejected |
| 55 | v55_tree_values_up | 37.2 | 35.2 | -2.0 | ❌ Rejected |
| 56 | v56_harvest_18 | 36.0 | 34.5 | -1.5 | ❌ Rejected |
| 57 | v57_harvest_8 | 37.8 | 34.6 | -3.2 | ❌ Rejected |
| 58 | v58_harvest_lp3 | 36.8 | 35.3 | -1.5 | ❌ Rejected |
| 59 | v59_harvest_count | 37.0 | 34.0 | -3.1 | ❌ Rejected |
| 60 | v60_harvest_count_15 | 37.0 | 34.0 | -3.1 | ❌ Rejected |
| 61 | v61_harvest_25 | 36.0 | 34.5 | -1.5 | ❌ Rejected |
| 62 | v62_harvest_lp3_18 | 36.4 | 34.5 | -1.9 | ❌ Rejected |
| 63 | v63_harvest_endgame | 37.8 | 34.6 | -3.2 | ❌ Rejected |
| 64 | v64_growth_ready | 36.6 | 34.4 | -2.2 | ❌ Rejected |
| 65 | v65_opp_lp_penalty | 38.8 | 39.3 | +0.5 | ✅ Adopted |
| 66 | v66_shadow_protect | 42.2 | 35.9 | -6.3 | ❌ Rejected |
| 67 | v67_lp_floor | 40.4 | 37.0 | -3.4 | ❌ Rejected |
| 68 | v68_endgame_surge_15 | 41.6 | 36.3 | -5.3 | ❌ Rejected |
| 69 | v69_center_exclusive | 40.4 | 32.6 | -7.8 | ❌ Rejected |
| 70 | v70_phase_v2 | 40.4 | 34.0 | -6.4 | ❌ Rejected |
| 71 | v71_medium_near_center | 40.2 | 36.9 | -3.3 | ❌ Rejected |
| 72 | v72_lp_ring_combo | 40.7 | 37.0 | -3.7 | ❌ Rejected |
| 73 | v73_vp_harvest_combo | 41.6 | 36.3 | -5.3 | ❌ Rejected |
| 74 | v74_lp_direct_vp_combo | 40.5 | 36.4 | -4.0 | ❌ Rejected |
| 75 | v75_full_lp_tuned | 40.0 | 36.3 | -3.7 | ❌ Rejected |
| 76 | v76_ring_area_lp | 40.9 | 32.9 | -7.9 | ❌ Rejected |
| 77 | v77_harvest_ring | 41.6 | 36.3 | -5.3 | ❌ Rejected |
| 78 | v78_balanced_champion | 41.2 | 34.5 | -6.6 | ❌ Rejected |
| 79 | v79_aggressive_champion | 43.3 | 36.1 | -7.2 | ❌ Rejected |
| 80 | v80_grand_champion | 42.6 | 36.6 | -6.0 | ❌ Rejected |

### Detailed Results

#### Round 31: v31_lp_direct_0_9

**Change**: LP_DIRECT 0.8→0.9  
**Result**: ❌ Rejected  
**Baseline avg VP**: 35.94  
**Challenger avg VP**: 34.45  
**Δ (challenger − baseline)**: -1.50  
**Time**: 36.6s  

#### Round 32: v32_lp_direct_1_0

**Change**: LP_DIRECT 0.8→1.0  
**Result**: ❌ Rejected  
**Baseline avg VP**: 35.94  
**Challenger avg VP**: 34.45  
**Δ (challenger − baseline)**: -1.50  
**Time**: 36.0s  

#### Round 33: v33_lp_vp_7

**Change**: LP_VP_WEIGHT 6→7  
**Result**: ❌ Rejected  
**Baseline avg VP**: 35.94  
**Challenger avg VP**: 34.45  
**Δ (challenger − baseline)**: -1.50  
**Time**: 36.1s  

#### Round 34: v34_lp_vp_8

**Change**: LP_VP_WEIGHT 6→8  
**Result**: ❌ Rejected  
**Baseline avg VP**: 34.89  
**Challenger avg VP**: 34.73  
**Δ (challenger − baseline)**: -0.16  
**Time**: 36.4s  

#### Round 35: v35_lp_future_t1_8

**Change**: LP_FUTURE_WEIGHTS[1] 7→8 (value next-turn LP more)  
**Result**: ❌ Rejected  
**Baseline avg VP**: 37.38  
**Challenger avg VP**: 32.78  
**Δ (challenger − baseline)**: -4.60  
**Time**: 34.8s  

#### Round 36: v36_lp_future_t1_9

**Change**: LP_FUTURE_WEIGHTS[1] 7→9  
**Result**: ❌ Rejected  
**Baseline avg VP**: 37.38  
**Challenger avg VP**: 33.31  
**Δ (challenger − baseline)**: -4.07  
**Time**: 34.9s  

#### Round 37: v37_lp_future_t2_4

**Change**: LP_FUTURE_WEIGHTS[2] 3→4.5 (more 2-turn look-ahead)  
**Result**: ❌ Rejected  
**Baseline avg VP**: 39.01  
**Challenger avg VP**: 30.27  
**Δ (challenger − baseline)**: -8.74  
**Time**: 34.4s  

#### Round 38: v38_lp_future_long_tail

**Change**: LP_FUTURE longer tail [0,7,3,2.5,1.5,0.8]  
**Result**: ❌ Rejected  
**Baseline avg VP**: 37.21  
**Challenger avg VP**: 34.04  
**Δ (challenger − baseline)**: -3.17  
**Time**: 36.4s  

#### Round 39: v39_lp_future_steep

**Change**: LP_FUTURE steeper decay [0,9,4,2,1,0.3]  
**Result**: ❌ Rejected  
**Baseline avg VP**: 37.93  
**Challenger avg VP**: 33.68  
**Δ (challenger − baseline)**: -4.25  
**Time**: 34.4s  

#### Round 40: v40_lp_combo

**Change**: LP combo: LP_DIRECT=0.9, LP_VP=7, FUTURE[1]=8  
**Result**: ❌ Rejected  
**Baseline avg VP**: 37.72  
**Challenger avg VP**: 32.82  
**Δ (challenger − baseline)**: -4.89  
**Time**: 34.8s  

#### Round 41: v41_ring0_11

**Change**: RING_BONUS[0] 10→11  
**Result**: ❌ Rejected  
**Baseline avg VP**: 37.21  
**Challenger avg VP**: 35.18  
**Δ (challenger − baseline)**: -2.04  
**Time**: 36.6s  

#### Round 42: v42_ring1_8

**Change**: RING_BONUS[1] 7→8  
**Result**: ❌ Rejected  
**Baseline avg VP**: 37.21  
**Challenger avg VP**: 35.18  
**Δ (challenger − baseline)**: -2.04  
**Time**: 36.6s  

#### Round 43: v43_ring_11_8

**Change**: RING_BONUS [11, 8, 3, 1]  
**Result**: ❌ Rejected  
**Baseline avg VP**: 37.21  
**Challenger avg VP**: 35.18  
**Δ (challenger − baseline)**: -2.04  
**Time**: 36.6s  

#### Round 44: v44_ring2_4

**Change**: RING_BONUS[2] 3→4 (value ring-2 trees more)  
**Result**: ❌ Rejected  
**Baseline avg VP**: 35.06  
**Challenger avg VP**: 32.51  
**Δ (challenger − baseline)**: -2.54  
**Time**: 34.9s  

#### Round 45: v45_vp_27

**Change**: VP_WEIGHT 25→27  
**Result**: ❌ Rejected  
**Baseline avg VP**: 37.21  
**Challenger avg VP**: 35.18  
**Δ (challenger − baseline)**: -2.04  
**Time**: 40.1s  

#### Round 46: v46_vp_23

**Change**: VP_WEIGHT 25→23 (test if 25 is over-valued)  
**Result**: ❌ Rejected  
**Baseline avg VP**: 37.21  
**Challenger avg VP**: 35.18  
**Δ (challenger − baseline)**: -2.04  
**Time**: 40.1s  

#### Round 47: v47_opp_board_1_0

**Change**: OPP_BOARD_FACTOR 0.9→1.0 (fully mirror opponent board)  
**Result**: ❌ Rejected  
**Baseline avg VP**: 37.21  
**Challenger avg VP**: 35.18  
**Δ (challenger − baseline)**: -2.04  
**Time**: 40.1s  

#### Round 48: v48_area_center_8

**Change**: AREA_CENTER_BONUS 5→8  
**Result**: ❌ Rejected  
**Baseline avg VP**: 37.92  
**Challenger avg VP**: 32.74  
**Δ (challenger − baseline)**: -5.17  
**Time**: 40.4s  

#### Round 49: v49_area_ring1_4

**Change**: AREA_RING1_BONUS 2.5→4  
**Result**: ❌ Rejected  
**Baseline avg VP**: 37.25  
**Challenger avg VP**: 34.08  
**Δ (challenger − baseline)**: -3.17  
**Time**: 39.5s  

#### Round 50: v50_ring_area_combo

**Change**: Ring [11,8,3,1] + AREA_CENTER=7  
**Result**: ❌ Rejected  
**Baseline avg VP**: 37.92  
**Challenger avg VP**: 32.74  
**Δ (challenger − baseline)**: -5.17  
**Time**: 4278.4s  

#### Round 51: v51_large_12

**Change**: tree-large value 10→12  
**Result**: ❌ Rejected  
**Baseline avg VP**: 37.66  
**Challenger avg VP**: 34.73  
**Δ (challenger − baseline)**: -2.93  
**Time**: 37.5s  

#### Round 52: v52_medium_5_5

**Change**: tree-medium value 4.5→5.5  
**Result**: ❌ Rejected  
**Baseline avg VP**: 35.63  
**Challenger avg VP**: 29.62  
**Δ (challenger − baseline)**: -6.01  
**Time**: 39.3s  

#### Round 53: v53_medium_5

**Change**: tree-medium value 4.5→5  
**Result**: ❌ Rejected  
**Baseline avg VP**: 35.86  
**Challenger avg VP**: 33.31  
**Δ (challenger − baseline)**: -2.55  
**Time**: 38.6s  

#### Round 54: v54_small_2_5

**Change**: tree-small value 2→2.5  
**Result**: ❌ Rejected  
**Baseline avg VP**: 38.31  
**Challenger avg VP**: 34.73  
**Δ (challenger − baseline)**: -3.58  
**Time**: 36.9s  

#### Round 55: v55_tree_values_up

**Change**: All tree values scaled up: [0.5, 2.5, 5, 11]  
**Result**: ❌ Rejected  
**Baseline avg VP**: 37.21  
**Challenger avg VP**: 35.18  
**Δ (challenger − baseline)**: -2.04  
**Time**: 3858.5s  

#### Round 56: v56_harvest_18

**Change**: Harvest readiness bonus 12→18  
**Result**: ❌ Rejected  
**Baseline avg VP**: 36.03  
**Challenger avg VP**: 34.49  
**Δ (challenger − baseline)**: -1.54  
**Time**: 6562.8s  

#### Round 57: v57_harvest_8

**Change**: Harvest readiness bonus 12→8 (less extreme)  
**Result**: ❌ Rejected  
**Baseline avg VP**: 37.76  
**Challenger avg VP**: 34.57  
**Δ (challenger − baseline)**: -3.19  
**Time**: 10156.3s  

#### Round 58: v58_harvest_lp3

**Change**: Harvest readiness trigger: LP≥3 instead of ≥4  
**Result**: ❌ Rejected  
**Baseline avg VP**: 36.83  
**Challenger avg VP**: 35.30  
**Δ (challenger − baseline)**: -1.53  
**Time**: 9790.5s  

#### Round 59: v59_harvest_count

**Change**: Harvest bonus scales with count of ready large trees (10/tree)  
**Result**: ❌ Rejected  
**Baseline avg VP**: 37.04  
**Challenger avg VP**: 33.96  
**Δ (challenger − baseline)**: -3.08  
**Time**: 2719.9s  

#### Round 60: v60_harvest_count_15

**Change**: Harvest count bonus 15/tree  
**Result**: ❌ Rejected  
**Baseline avg VP**: 37.04  
**Challenger avg VP**: 33.96  
**Δ (challenger − baseline)**: -3.08  
**Time**: 50.4s  

#### Round 61: v61_harvest_25

**Change**: Harvest readiness bonus 12→25  
**Result**: ❌ Rejected  
**Baseline avg VP**: 36.03  
**Challenger avg VP**: 34.49  
**Δ (challenger − baseline)**: -1.54  
**Time**: 49.1s  

#### Round 62: v62_harvest_lp3_18

**Change**: Harvest trigger LP≥3 + bonus 18  
**Result**: ❌ Rejected  
**Baseline avg VP**: 36.41  
**Challenger avg VP**: 34.49  
**Δ (challenger − baseline)**: -1.92  
**Time**: 1237.8s  

#### Round 63: v63_harvest_endgame

**Change**: Endgame VP surge (+20 at rev 2)  
**Result**: ❌ Rejected  
**Baseline avg VP**: 37.76  
**Challenger avg VP**: 34.57  
**Δ (challenger − baseline)**: -3.19  
**Time**: 6008.1s  

#### Round 64: v64_growth_ready

**Change**: Growth-readiness: bonus when large in hand + medium on board  
**Result**: ❌ Rejected  
**Baseline avg VP**: 36.62  
**Challenger avg VP**: 34.39  
**Δ (challenger − baseline)**: -2.23  
**Time**: 3797.9s  

#### Round 65: v65_opp_lp_penalty

**Change**: Opponent LP penalty: extra penalise opponents with more LP  
**Result**: ✅ Adopted as new baseline  
**Baseline avg VP**: 38.79  
**Challenger avg VP**: 39.30  
**Δ (challenger − baseline)**: +0.51  
**Time**: 10334.9s  

#### Round 66: v66_shadow_protect

**Change**: Shadow-protection: bonus for own trees unshaded next turn  
**Result**: ❌ Rejected  
**Baseline avg VP**: 42.18  
**Challenger avg VP**: 35.88  
**Δ (challenger − baseline)**: -6.30  
**Time**: 7950.1s  

#### Round 67: v67_lp_floor

**Change**: LP floor bonus: +5 when LP ≥ 7  
**Result**: ❌ Rejected  
**Baseline avg VP**: 40.41  
**Challenger avg VP**: 36.97  
**Δ (challenger − baseline)**: -3.44  
**Time**: 12005.4s  

#### Round 68: v68_endgame_surge_15

**Change**: Endgame VP surge: +15 at revolution 2+  
**Result**: ❌ Rejected  
**Baseline avg VP**: 41.59  
**Challenger avg VP**: 36.28  
**Δ (challenger − baseline)**: -5.31  
**Time**: 54.2s  

#### Round 69: v69_center_exclusive

**Change**: Center exclusivity: +15 bonus if sole occupant of rings 0-1  
**Result**: ❌ Rejected  
**Baseline avg VP**: 40.41  
**Challenger avg VP**: 32.57  
**Δ (challenger − baseline)**: -7.84  
**Time**: 47.2s  

#### Round 70: v70_phase_v2

**Change**: Phase-aware v2: softer multipliers (1.4x LP early, 1.5x VP late)  
**Result**: ❌ Rejected  
**Baseline avg VP**: 40.41  
**Challenger avg VP**: 33.97  
**Δ (challenger − baseline)**: -6.44  
**Time**: 48.0s  

#### Round 71: v71_medium_near_center

**Change**: Medium near center bonus: +3 per medium tree in rings 0-1  
**Result**: ❌ Rejected  
**Baseline avg VP**: 40.15  
**Challenger avg VP**: 36.89  
**Δ (challenger − baseline)**: -3.26  
**Time**: 42.5s  

#### Round 72: v72_lp_ring_combo

**Change**: LP_DIRECT 0.9 + RING [10,8,3,1]  
**Result**: ❌ Rejected  
**Baseline avg VP**: 40.70  
**Challenger avg VP**: 37.01  
**Δ (challenger − baseline)**: -3.69  
**Time**: 42.5s  

#### Round 73: v73_vp_harvest_combo

**Change**: VP_WEIGHT 27 + harvest bonus 16  
**Result**: ❌ Rejected  
**Baseline avg VP**: 41.59  
**Challenger avg VP**: 36.28  
**Δ (challenger − baseline)**: -5.31  
**Time**: 42.1s  

#### Round 74: v74_lp_direct_vp_combo

**Change**: LP_DIRECT 1.0 + LP_VP_WEIGHT 7  
**Result**: ❌ Rejected  
**Baseline avg VP**: 40.49  
**Challenger avg VP**: 36.45  
**Δ (challenger − baseline)**: -4.05  
**Time**: 41.8s  

#### Round 75: v75_full_lp_tuned

**Change**: LP combo: LP_DIRECT=0.9, LP_VP=7, FUTURE=[0,8,4,2,1,0.5]  
**Result**: ❌ Rejected  
**Baseline avg VP**: 40.03  
**Challenger avg VP**: 36.28  
**Δ (challenger − baseline)**: -3.74  
**Time**: 41.0s  

#### Round 76: v76_ring_area_lp

**Change**: Ring [11,8,3,1] + AREA_CENTER=8 + AREA_RING1=4  
**Result**: ❌ Rejected  
**Baseline avg VP**: 40.86  
**Challenger avg VP**: 32.95  
**Δ (challenger − baseline)**: -7.91  
**Time**: 41.9s  

#### Round 77: v77_harvest_ring

**Change**: Harvest bonus 16 + ring [11,7,3,1]  
**Result**: ❌ Rejected  
**Baseline avg VP**: 41.59  
**Challenger avg VP**: 36.28  
**Δ (challenger − baseline)**: -5.31  
**Time**: 42.2s  

#### Round 78: v78_balanced_champion

**Change**: Balanced: LP_DIRECT=0.85, VP=26, ring=[10,7,3.5,1.5]  
**Result**: ❌ Rejected  
**Baseline avg VP**: 41.17  
**Challenger avg VP**: 34.54  
**Δ (challenger − baseline)**: -6.63  
**Time**: 41.3s  

#### Round 79: v79_aggressive_champion

**Change**: Aggressive: LP_DIRECT=1.0, LP_VP=8, VP=27  
**Result**: ❌ Rejected  
**Baseline avg VP**: 43.30  
**Challenger avg VP**: 36.05  
**Δ (challenger − baseline)**: -7.24  
**Time**: 43.4s  

#### Round 80: v80_grand_champion

**Change**: Grand champion: LP_DIRECT=0.95, LP_VP=7, VP=26, ring=[11,8,3,1], area_center=7, harvest=15  
**Result**: ❌ Rejected  
**Baseline avg VP**: 42.63  
**Challenger avg VP**: 36.64  
**Δ (challenger − baseline)**: -6.00  
**Time**: 42.1s  



---

## Round 3: Experiments 81–130 (Novel Heuristics, 50 games each)

**Final expert model after round 3**: v122_pipeline_harvest_combo  
**New improvements adopted**: 8/50  
**Novel heuristic types introduced**: score pile awareness, inventory pipeline, hex sector spread, shadow blocking, net shadow, tempo  
**Tournament format**: depth=2, 50 games per round (20×2p, 15×3p, 15×4p)  

### Summary Table

| Round | Name | Baseline Avg VP | Challenger Avg VP | Δ | Result |
|------:|------|----------------:|------------------:|--:|--------|
| 81 | v81_score_pile_0_25 | 37.1 | 34.9 | -2.2 | ❌ Rejected |
| 82 | v82_score_pile_0_4 | 38.2 | 34.1 | -4.1 | ❌ Rejected |
| 83 | v83_score_pile_0_15 | 37.7 | 33.3 | -4.4 | ❌ Rejected |
| 84 | v84_harvest_timing_0_4 | 37.8 | 34.6 | -3.2 | ❌ Rejected |
| 85 | v85_harvest_timing_0_6 | 37.8 | 34.6 | -3.2 | ❌ Rejected |
| 86 | v86_score_pile_harvest_combo | 37.7 | 33.3 | -4.4 | ❌ Rejected |
| 87 | v87_ring0_large_bonus | 37.2 | 35.2 | -2.0 | ❌ Rejected |
| 88 | v88_pile_depletion | 36.0 | 34.5 | -1.5 | ❌ Rejected |
| 89 | v89_pipeline_2_5 | 34.6 | 32.9 | -1.7 | ❌ Rejected |
| 90 | v90_pipeline_4 | 29.9 | 33.1 | +3.2 | ✅ Adopted |
| 91 | v91_pipeline_1_5 | 39.5 | 29.9 | -9.5 | ❌ Rejected |
| 92 | v92_available_priority | 30.8 | 20.5 | -10.2 | ❌ Rejected |
| 93 | v93_tempo_3 | 31.5 | 21.5 | -10.0 | ❌ Rejected |
| 94 | v94_growth_ready_8 | 36.3 | 28.3 | -8.0 | ❌ Rejected |
| 95 | v95_growth_ready_12 | 37.1 | 30.9 | -6.2 | ❌ Rejected |
| 96 | v96_sector_spread_3 | 34.4 | 32.1 | -2.2 | ❌ Rejected |
| 97 | v97_sector_spread_5 | 31.7 | 29.9 | -1.8 | ❌ Rejected |
| 98 | v98_sector_spread_2 | 33.7 | 32.1 | -1.7 | ❌ Rejected |
| 99 | v99_sector_exclusive_4 | 30.1 | 28.8 | -1.3 | ❌ Rejected |
| 100 | v100_sector_exclusive_7 | 29.2 | 31.1 | +1.9 | ✅ Adopted |
| 101 | v101_sector_harvest_combo | 34.1 | 28.9 | -5.2 | ❌ Rejected |
| 102 | v102_ring_spread_bonus | 31.6 | 34.2 | +2.6 | ✅ Adopted |
| 103 | v103_shadow_block_2 | 33.1 | 28.1 | -5.0 | ❌ Rejected |
| 104 | v104_shadow_block_3 | 32.5 | 27.3 | -5.2 | ❌ Rejected |
| 105 | v105_shadow_block_1_5 | 33.1 | 28.7 | -4.4 | ❌ Rejected |
| 106 | v106_net_shadow_3 | 32.5 | 32.3 | -0.2 | ❌ Rejected |
| 107 | v107_net_shadow_5 | 32.2 | 34.9 | +2.7 | ✅ Adopted |
| 108 | v108_net_shadow_2 | 30.7 | 37.0 | +6.3 | ✅ Adopted |
| 109 | v109_shadow_harvest_combo | 35.4 | 33.1 | -2.3 | ❌ Rejected |
| 110 | v110_opp_lp_penalty_0_4 | 35.5 | 38.9 | +3.4 | ✅ Adopted |
| 111 | v111_opp_lp_penalty_0_6 | 40.9 | 34.0 | -7.0 | ❌ Rejected |
| 112 | v112_endgame_surge_18 | 43.2 | 34.6 | -8.6 | ❌ Rejected |
| 113 | v113_endgame_surge_25 | 43.2 | 34.6 | -8.6 | ❌ Rejected |
| 114 | v114_endgame_surge_12 | 43.2 | 34.6 | -8.6 | ❌ Rejected |
| 115 | v115_phase_v3 | 43.2 | 32.9 | -10.2 | ❌ Rejected |
| 116 | v116_phase_v4 | 43.3 | 33.4 | -9.9 | ❌ Rejected |
| 117 | v117_endgame_harvest_combo | 43.2 | 34.6 | -8.6 | ❌ Rejected |
| 118 | v118_phase_harvest_combo | 43.3 | 33.4 | -9.9 | ❌ Rejected |
| 119 | v119_lp_direct_sector | 33.8 | 35.3 | +1.5 | ✅ Adopted |
| 120 | v120_lp_shadow_combo | 35.4 | 31.2 | -4.2 | ❌ Rejected |
| 121 | v121_ring_shadow_combo | 35.7 | 30.6 | -5.1 | ❌ Rejected |
| 122 | v122_pipeline_harvest_combo | 30.3 | 36.5 | +6.1 | ✅ Adopted |
| 123 | v123_tempo_harvest_combo | 33.9 | 23.9 | -10.0 | ❌ Rejected |
| 124 | v124_score_pile_ring | 41.0 | 33.3 | -7.6 | ❌ Rejected |
| 125 | v125_net_shadow_lp | 38.1 | 31.3 | -6.9 | ❌ Rejected |
| 126 | v126_growth_sector_combo | 39.6 | 32.3 | -7.4 | ❌ Rejected |
| 127 | v127_novel_champion_v1 | 38.5 | 31.1 | -7.4 | ❌ Rejected |
| 128 | v128_novel_champion_v2 | 39.6 | 32.2 | -7.4 | ❌ Rejected |
| 129 | v129_all_novel_stacked | 40.0 | 30.6 | -9.4 | ❌ Rejected |
| 130 | v130_ultimate_champion | 38.8 | 33.1 | -5.7 | ❌ Rejected |

### Detailed Results

#### Round 81: v81_score_pile_0_25

**Change**: Score pile awareness: large-tree bonus weighted by best remaining tile (×0.25)  
**Result**: ❌ Rejected  
**Baseline avg VP**: 37.08  
**Challenger avg VP**: 34.93  
**Δ**: -2.15  
**Time**: 34.6s  

#### Round 82: v82_score_pile_0_4

**Change**: Score pile awareness ×0.4  
**Result**: ❌ Rejected  
**Baseline avg VP**: 38.21  
**Challenger avg VP**: 34.12  
**Δ**: -4.09  
**Time**: 33.7s  

#### Round 83: v83_score_pile_0_15

**Change**: Score pile awareness ×0.15 (lighter touch)  
**Result**: ❌ Rejected  
**Baseline avg VP**: 37.72  
**Challenger avg VP**: 33.31  
**Δ**: -4.41  
**Time**: 34.4s  

#### Round 84: v84_harvest_timing_0_4

**Change**: Harvest timing: bonus for harvestable large trees × best remaining tile value (×0.4)  
**Result**: ❌ Rejected  
**Baseline avg VP**: 37.76  
**Challenger avg VP**: 34.57  
**Δ**: -3.19  
**Time**: 35.2s  

#### Round 85: v85_harvest_timing_0_6

**Change**: Harvest timing ×0.6  
**Result**: ❌ Rejected  
**Baseline avg VP**: 37.76  
**Challenger avg VP**: 34.57  
**Δ**: -3.19  
**Time**: 35.2s  

#### Round 86: v86_score_pile_harvest_combo

**Change**: Score pile ×0.25 + harvest readiness bonus 12  
**Result**: ❌ Rejected  
**Baseline avg VP**: 37.72  
**Challenger avg VP**: 33.31  
**Δ**: -4.41  
**Time**: 49.6s  

#### Round 87: v87_ring0_large_bonus

**Change**: Extra +6 for each own large tree in ring 0 (best harvest value)  
**Result**: ❌ Rejected  
**Baseline avg VP**: 37.21  
**Challenger avg VP**: 35.18  
**Δ**: -2.04  
**Time**: 35.5s  

#### Round 88: v88_pile_depletion

**Change**: Pile depletion urgency: harvest bonus multiplied by revolution (late game)  
**Result**: ❌ Rejected  
**Baseline avg VP**: 36.03  
**Challenger avg VP**: 34.49  
**Δ**: -1.54  
**Time**: 35.5s  

#### Round 89: v89_pipeline_2_5

**Change**: Pipeline completeness: +2.5 per piece type in available/inventory  
**Result**: ❌ Rejected  
**Baseline avg VP**: 34.62  
**Challenger avg VP**: 32.88  
**Δ**: -1.74  
**Time**: 36.8s  

#### Round 90: v90_pipeline_4

**Change**: Pipeline completeness: +4 per stage  
**Result**: ✅ Adopted as new baseline  
**Baseline avg VP**: 29.90  
**Challenger avg VP**: 33.12  
**Δ**: +3.22  
**Time**: 38.0s  

#### Round 91: v91_pipeline_1_5

**Change**: Pipeline completeness: +1.5 per stage (lighter)  
**Result**: ❌ Rejected  
**Baseline avg VP**: 39.45  
**Challenger avg VP**: 29.95  
**Δ**: -9.50  
**Time**: 40.6s  

#### Round 92: v92_available_priority

**Change**: Available count: +2 per piece in available (more action options)  
**Result**: ❌ Rejected  
**Baseline avg VP**: 30.76  
**Challenger avg VP**: 20.51  
**Δ**: -10.25  
**Time**: 45.1s  

#### Round 93: v93_tempo_3

**Change**: Tempo advantage: +3 per available piece lead over opponents  
**Result**: ❌ Rejected  
**Baseline avg VP**: 31.48  
**Challenger avg VP**: 21.47  
**Δ**: -10.01  
**Time**: 38.8s  

#### Round 94: v94_growth_ready_8

**Change**: Growth readiness: +8 when large in hand + medium on board  
**Result**: ❌ Rejected  
**Baseline avg VP**: 36.27  
**Challenger avg VP**: 28.27  
**Δ**: -8.00  
**Time**: 38.8s  

#### Round 95: v95_growth_ready_12

**Change**: Growth readiness: +12 when large in hand + medium on board  
**Result**: ❌ Rejected  
**Baseline avg VP**: 37.11  
**Challenger avg VP**: 30.93  
**Δ**: -6.18  
**Time**: 38.9s  

#### Round 96: v96_sector_spread_3

**Change**: Sector spread: +3 per unique board sector occupied  
**Result**: ❌ Rejected  
**Baseline avg VP**: 34.35  
**Challenger avg VP**: 32.15  
**Δ**: -2.20  
**Time**: 40.1s  

#### Round 97: v97_sector_spread_5

**Change**: Sector spread: +5 per sector  
**Result**: ❌ Rejected  
**Baseline avg VP**: 31.69  
**Challenger avg VP**: 29.88  
**Δ**: -1.81  
**Time**: 38.2s  

#### Round 98: v98_sector_spread_2

**Change**: Sector spread: +2 per sector (lighter)  
**Result**: ❌ Rejected  
**Baseline avg VP**: 33.72  
**Challenger avg VP**: 32.07  
**Δ**: -1.65  
**Time**: 38.1s  

#### Round 99: v99_sector_exclusive_4

**Change**: Sector exclusivity: +4 per sector where only we have trees  
**Result**: ❌ Rejected  
**Baseline avg VP**: 30.07  
**Challenger avg VP**: 28.81  
**Δ**: -1.26  
**Time**: 36.9s  

#### Round 100: v100_sector_exclusive_7

**Change**: Sector exclusivity: +7 per exclusive sector  
**Result**: ✅ Adopted as new baseline  
**Baseline avg VP**: 29.18  
**Challenger avg VP**: 31.11  
**Δ**: +1.93  
**Time**: 36.9s  

#### Round 101: v101_sector_harvest_combo

**Change**: Sector spread 3 + harvest readiness 12  
**Result**: ❌ Rejected  
**Baseline avg VP**: 34.13  
**Challenger avg VP**: 28.93  
**Δ**: -5.19  
**Time**: 44.6s  

#### Round 102: v102_ring_spread_bonus

**Change**: Ring spread: +3 per unique ring occupied (encourage board coverage)  
**Result**: ✅ Adopted as new baseline  
**Baseline avg VP**: 31.56  
**Challenger avg VP**: 34.20  
**Δ**: +2.64  
**Time**: 32.2s  

#### Round 103: v103_shadow_block_2

**Change**: Shadow blocking: +2 per LP blocked from opponents in next 3 turns  
**Result**: ❌ Rejected  
**Baseline avg VP**: 33.10  
**Challenger avg VP**: 28.09  
**Δ**: -5.00  
**Time**: 33.8s  

#### Round 104: v104_shadow_block_3

**Change**: Shadow blocking: +3 per LP blocked  
**Result**: ❌ Rejected  
**Baseline avg VP**: 32.51  
**Challenger avg VP**: 27.32  
**Δ**: -5.18  
**Time**: 32.7s  

#### Round 105: v105_shadow_block_1_5

**Change**: Shadow blocking: +1.5 per LP blocked (lighter)  
**Result**: ❌ Rejected  
**Baseline avg VP**: 33.10  
**Challenger avg VP**: 28.66  
**Δ**: -4.44  
**Time**: 33.7s  

#### Round 106: v106_net_shadow_3

**Change**: Net shadow balance: +3 per LP we block vs opponent blocks us  
**Result**: ❌ Rejected  
**Baseline avg VP**: 32.51  
**Challenger avg VP**: 32.34  
**Δ**: -0.17  
**Time**: 34.0s  

#### Round 107: v107_net_shadow_5

**Change**: Net shadow balance: +5 per LP net shadow lead  
**Result**: ✅ Adopted as new baseline  
**Baseline avg VP**: 32.21  
**Challenger avg VP**: 34.89  
**Δ**: +2.68  
**Time**: 120.1s  

#### Round 108: v108_net_shadow_2

**Change**: Net shadow balance: +2  
**Result**: ✅ Adopted as new baseline  
**Baseline avg VP**: 30.70  
**Challenger avg VP**: 37.00  
**Δ**: +6.30  
**Time**: 288.3s  

#### Round 109: v109_shadow_harvest_combo

**Change**: Shadow block 2 + harvest readiness 12  
**Result**: ❌ Rejected  
**Baseline avg VP**: 35.35  
**Challenger avg VP**: 33.07  
**Δ**: -2.28  
**Time**: 57.2s  

#### Round 110: v110_opp_lp_penalty_0_4

**Change**: Opponent LP penalty: −0.4 × (opponent LP − own LP) when behind  
**Result**: ✅ Adopted as new baseline  
**Baseline avg VP**: 35.52  
**Challenger avg VP**: 38.92  
**Δ**: +3.40  
**Time**: 44.1s  

#### Round 111: v111_opp_lp_penalty_0_6

**Change**: Opponent LP penalty ×0.6  
**Result**: ❌ Rejected  
**Baseline avg VP**: 40.94  
**Challenger avg VP**: 33.96  
**Δ**: -6.98  
**Time**: 45.8s  

#### Round 112: v112_endgame_surge_18

**Change**: Endgame VP surge: +18 to VP_WEIGHT at revolution 2  
**Result**: ❌ Rejected  
**Baseline avg VP**: 43.23  
**Challenger avg VP**: 34.61  
**Δ**: -8.62  
**Time**: 41.7s  

#### Round 113: v113_endgame_surge_25

**Change**: Endgame VP surge: +25  
**Result**: ❌ Rejected  
**Baseline avg VP**: 43.23  
**Challenger avg VP**: 34.61  
**Δ**: -8.62  
**Time**: 41.4s  

#### Round 114: v114_endgame_surge_12

**Change**: Endgame VP surge: +12 (lighter)  
**Result**: ❌ Rejected  
**Baseline avg VP**: 43.23  
**Challenger avg VP**: 34.61  
**Δ**: -8.62  
**Time**: 41.4s  

#### Round 115: v115_phase_v3

**Change**: Phase v3: 1.5× LP early, 1.6× VP late (steeper)  
**Result**: ❌ Rejected  
**Baseline avg VP**: 43.18  
**Challenger avg VP**: 32.95  
**Δ**: -10.24  
**Time**: 41.9s  

#### Round 116: v116_phase_v4

**Change**: Phase v4: subtle 1.2× LP early, 1.3× VP late  
**Result**: ❌ Rejected  
**Baseline avg VP**: 43.27  
**Challenger avg VP**: 33.35  
**Δ**: -9.92  
**Time**: 41.5s  

#### Round 117: v117_endgame_harvest_combo

**Change**: Endgame surge 15 + harvest readiness 12  
**Result**: ❌ Rejected  
**Baseline avg VP**: 43.23  
**Challenger avg VP**: 34.61  
**Δ**: -8.62  
**Time**: 56.5s  

#### Round 118: v118_phase_harvest_combo

**Change**: Phase v3 + harvest readiness 12  
**Result**: ❌ Rejected  
**Baseline avg VP**: 43.27  
**Challenger avg VP**: 33.35  
**Δ**: -9.92  
**Time**: 56.5s  

#### Round 119: v119_lp_direct_sector

**Change**: LP_DIRECT 0.9 + sector spread 3  
**Result**: ✅ Adopted as new baseline  
**Baseline avg VP**: 33.76  
**Challenger avg VP**: 35.28  
**Δ**: +1.52  
**Time**: 40.6s  

#### Round 120: v120_lp_shadow_combo

**Change**: LP_DIRECT 0.9 + shadow block 2  
**Result**: ❌ Rejected  
**Baseline avg VP**: 35.38  
**Challenger avg VP**: 31.19  
**Δ**: -4.19  
**Time**: 37.5s  

#### Round 121: v121_ring_shadow_combo

**Change**: Ring [11,8,3,1] + shadow block 2  
**Result**: ❌ Rejected  
**Baseline avg VP**: 35.68  
**Challenger avg VP**: 30.58  
**Δ**: -5.09  
**Time**: 38.0s  

#### Round 122: v122_pipeline_harvest_combo

**Change**: Pipeline 2.5 + harvest readiness 12  
**Result**: ✅ Adopted as new baseline  
**Baseline avg VP**: 30.31  
**Challenger avg VP**: 36.46  
**Δ**: +6.15  
**Time**: 56.5s  

#### Round 123: v123_tempo_harvest_combo

**Change**: Tempo 2.0 + harvest readiness 12  
**Result**: ❌ Rejected  
**Baseline avg VP**: 33.86  
**Challenger avg VP**: 23.86  
**Δ**: -9.99  
**Time**: 77.0s  

#### Round 124: v124_score_pile_ring

**Change**: Score pile 0.3 + ring [11,7,3,1]  
**Result**: ❌ Rejected  
**Baseline avg VP**: 40.96  
**Challenger avg VP**: 33.31  
**Δ**: -7.65  
**Time**: 56.9s  

#### Round 125: v125_net_shadow_lp

**Change**: Net shadow 3 + LP_DIRECT 0.9  
**Result**: ❌ Rejected  
**Baseline avg VP**: 38.14  
**Challenger avg VP**: 31.27  
**Δ**: -6.87  
**Time**: 60.1s  

#### Round 126: v126_growth_sector_combo

**Change**: Growth readiness 8 + sector spread 3  
**Result**: ❌ Rejected  
**Baseline avg VP**: 39.65  
**Challenger avg VP**: 32.30  
**Δ**: -7.35  
**Time**: 65.6s  

#### Round 127: v127_novel_champion_v1

**Change**: Novel champion: shadow block 2 + score pile 0.2 + pipeline 2  
**Result**: ❌ Rejected  
**Baseline avg VP**: 38.51  
**Challenger avg VP**: 31.07  
**Δ**: -7.44  
**Time**: 89.3s  

#### Round 128: v128_novel_champion_v2

**Change**: Novel champion: LP 0.9 + sector spread 3 + harvest ready 14  
**Result**: ❌ Rejected  
**Baseline avg VP**: 39.65  
**Challenger avg VP**: 32.24  
**Δ**: -7.40  
**Time**: 68.4s  

#### Round 129: v129_all_novel_stacked

**Change**: All novel: shadow block 1.5 + score pile 0.2 + sector 2 + harvest 10  
**Result**: ❌ Rejected  
**Baseline avg VP**: 40.03  
**Challenger avg VP**: 30.62  
**Δ**: -9.41  
**Time**: 98.6s  

#### Round 130: v130_ultimate_champion

**Change**: Ultimate: LP_DIRECT 0.9, ring [11,8,3,1], shadow block 2, score pile 0.25, harvest 12  
**Result**: ❌ Rejected  
**Baseline avg VP**: 38.80  
**Challenger avg VP**: 33.09  
**Δ**: -5.71  
**Time**: 89.1s  

