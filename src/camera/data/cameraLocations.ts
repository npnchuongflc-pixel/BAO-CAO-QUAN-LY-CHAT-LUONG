/**
 * Master mapping of camera to reference position images / Drive links
 * Extracted directly from Google Sheet columns U-W (TÊN THIẾT BỊ & LINK VỊ TRÍ)
 */
export const MASTER_CAMERA_LOCATIONS: Record<string, string> = {
  "APC0": "https://drive.google.com/file/d/1p8iYX1Vqewl2qwKQqnvhtbzky8dwB6r4/view?usp=drive_link",
  "APC1": "https://drive.google.com/file/d/1w5eCl2PSjn9DuRyrY6zDnStXsyUUlFxL/view?usp=drive_link",
  "APC2": "https://drive.google.com/file/d/1mtEWDmnrgbm3ZIQ7lByrLtJvQpZJpWs-/view?usp=drive_link",
  "APC3": "https://drive.google.com/file/d/1S1soj8FzPNbNAXB5Lq5gSmkTvtn5hm5_/view?usp=drive_link",
  "APC7": "https://drive.google.com/file/d/1ILH2q9MtczSkSurz6dh53-IJuoKwN65F/view?usp=drive_link",
  "BTC0": "https://drive.google.com/file/d/1MrLFI3kwnuawTyOsSx2ShUjgnxoOTAVZ/view?usp=sharing",
  "BTC1": "https://drive.google.com/file/d/1F3HfOWRO7tilMxFO_ZY4q1YK5vE0jbOc/view?usp=sharing",
  "BTC2": "https://drive.google.com/file/d/15lRyLP1BsmZsy-pv1wA1qCzkEWFK_CJ_/view?usp=sharing",
  "BTC3": "https://drive.google.com/file/d/1rAioAjRpuRIlhbIbHG4VgXr-folzw3r5/view?usp=sharing",
  "BTC4": "https://drive.google.com/file/d/1cXWtipmYVVPkjzwIZf6jsYz1m_D4VpVS/view?usp=sharing",
  "BTC7": "https://drive.google.com/file/d/1fHBatfJrwAhK8G92wabSQiFGt-GNQHrL/view?usp=sharing",
  "DHC1": "https://drive.google.com/file/d/18tY3OaAV2UHrcwgFZdHv0yghIKml4lFT/view?usp=sharing",
  "DHC2": "https://drive.google.com/file/d/13LXdRsFW37y3CjGHhyMIThro7jspliy3/view?usp=sharing",
  "DHC4": "https://drive.google.com/file/d/15mmGtDiJOpgbmcGWEWISTXuQaArneGj8/view?usp=sharing",
  "DHC7": "https://drive.google.com/file/d/1k8D_TNrNmeB4S60uvH5_nHs8XLLadehV/view?usp=sharing",
  "GGM4": "https://drive.google.com/file/d/1m7dLIO7ntwXs0ff_5azDQNtsj7XVY-lX/view?usp=sharing",
  "GGM6": "https://drive.google.com/file/d/1Af8bjjoxbhDgubYysu1LLSVKFdKzTbHh/view?usp=sharing",
  "GGM7": "https://drive.google.com/file/d/1zzbSOCZVzmXaxpowGxieff0d0pkU6vVl/view?usp=sharing",
  "GHC1": "https://drive.google.com/file/d/1EGdKEJj8sY1P4_TyS5e1MBUMz5LtQJ7h/view?usp=sharing",
  "GHC2": "https://drive.google.com/file/d/1bt0bzE9LpNpT1M47tHTdKGxLPLKDB3Zu/view?usp=sharing",
  "GHC7": "https://drive.google.com/file/d/1obmr0FCjjJFpcySKZ-jjdc9pQPNsw1le/view?usp=sharing",
  "GVC0": "https://drive.google.com/file/d/1dxPwI0y-Wj8UfR2TvC6ggFe64dzufYKL/view?usp=sharing",
  "GVC1": "https://drive.google.com/file/d/1cGhOYbMriqymUyTtYjSlNY0tDn_ak1Wz/view?usp=sharing",
  "GVC2": "https://drive.google.com/file/d/1vxMf37ritnlVojx4b1g0siIJeiGSGtrT/view?usp=sharing",
  "GVC3": "https://drive.google.com/file/d/1gdb5vfeST2PMjMSVl6BLn3ZxYUvLwcgW/view?usp=sharing",
  "GVC6": "https://drive.google.com/file/d/1YUrJn0qpHZG6pfad9I7mk3_RlAQLEPEN/view?usp=sharing",
  "GVC7": "https://drive.google.com/file/d/16DVEevEbzbt0ig9dGHV8qGfEAOZHlQgn/view?usp=sharing",
  "HDC1": "https://drive.google.com/file/d/1u4kJsLYcnSgxEuh9wVgiMOA-vvYtdM8T/view?usp=sharing",
  "HDC2": "https://drive.google.com/file/d/1F__LbZ83MQqvCFtOTZRHwFxBWG3AAU3D/view?usp=sharing",
  "HDC3": "https://drive.google.com/file/d/1HUxcwt6evsHfQeNWYdiFibNZgOM7JLDt/view?usp=sharing",
  "HDC4": "https://drive.google.com/file/d/17lGzOsQFRVE54bPR63Enl-AJAxHBkCxe/view?usp=sharing",
  "HDC5": "https://drive.google.com/file/d/13QqTgDcDnhY-fS3_ASQc6GNElNqlVRIh/view?usp=sharing",
  "HDC7": "https://drive.google.com/file/d/1Wjgjuu4hNQHww6xdeCJzPlytpSsweyYK/view?usp=sharing",
  "HTC0": "https://drive.google.com/file/d/1nCVvLV9HiWXfdat_mYK_I8sOVUN23znS/view?usp=sharing",
  "HTC1": "https://drive.google.com/file/d/1sNCrMh8-PFHipBC0J-yGvEdca2FrW-JM/view?usp=sharing",
  "HTC2": "https://drive.google.com/file/d/1TPNxFyb4tAS2fxxRVw9x_vqwHqYpRrd0/view?usp=sharing",
  "HTC3": "https://drive.google.com/file/d/1dTB3FCzGOdTd-C12f1ibw8n9z2_11tVM/view?usp=sharing",
  "HTC7": "https://drive.google.com/file/d/1ZNycKxdfotoMsBT7yzjHIgC4go_bnSVE/view?usp=sharing",
  "MLC1": "https://drive.google.com/file/d/1anHjJMeORJHMq3JfYz9GtyHnxUscTeJY/view?usp=sharing",
  "MLC2": "https://drive.google.com/file/d/1l7543Br6KxebucuHQkBBDh2W3h3QVxdk/view?usp=sharing",
  "MLC7": "https://drive.google.com/file/d/1IOZmAqPHHqQdmyVlKFZ0XwuyRbxUUlD4/view?usp=sharing",
  "NDT2": "https://drive.google.com/file/d/1nelkYfcPBTiDpT-0QCZR2KFzL4qMzW-u/view?usp=sharing",
  "NDT3": "https://drive.google.com/file/d/1pZqMwtBnj6BnzfwcIMx1xr1gzBR6NVbL/view?usp=sharing",
  "NDT7": "https://drive.google.com/file/d/17aBzBEBHVwfkXRkWeLlNNDHCXcVhcqHf/view?usp=sharing",
  "PNC0": "https://drive.google.com/file/d/14ar7HrdFLgIFn0zuUCJ-02KJ18MCwgeK/view?usp=sharing",
  "PNC1": "https://drive.google.com/file/d/1oYxGwEnvHyk_PgAmo_vzelF2KoLZr-8R/view?usp=sharing",
  "PNC2": "https://drive.google.com/file/d/1Ioyjja0GxWqZNrepU0iWWgY1sYqXazuS/view?usp=sharing",
  "PNC7": "https://drive.google.com/file/d/11FNaSlFbqvQx7c4kt0SnCSNTuJlaw6YC/view?usp=sharing",
  "PQC0": "https://drive.google.com/file/d/1fQ8kGfO3cE2RB79HC57xrdR_Rlh85Lnr/view?usp=sharing",
  "PQC1": "https://drive.google.com/file/d/10RWzSAMtz6dn-hxVcExa1fkBaJXv_sSz/view?usp=sharing",
  "PQC2": "https://drive.google.com/file/d/1Ub9z-Y6YDU1Pkji6OQ8csoTVvv6s8IGa/view?usp=sharing",
  "PQC4": "https://drive.google.com/file/d/1Xmw0h3VSNYTGDxilvxHXP62RNnV0Q5WL/view?usp=sharing",
  "PQC5": "https://drive.google.com/file/d/163iiYQCPKmiRUNyyXOhd9yAndFkojxSz/view?usp=sharing",
  "PQC7": "https://drive.google.com/file/d/1xgzcsarXkvUzPJNLQgzPvGeatKt55YwF/view?usp=sharing",
  "RMC0": "https://drive.google.com/file/d/1WgZFOFA-aYeTrU_FZQ9cXpwDL2zR1fBH/view?usp=sharing",
  "RMC1": "https://drive.google.com/file/d/1AtvfK-900e6iFmR6zXZo2AS14vruD9ve/view?usp=sharing",
  "RMC2": "https://drive.google.com/file/d/1ZZLav7AqJUULRyV39nLaMl6AX26QgHhn/view?usp=sharing",
  "RMC7": "https://drive.google.com/file/d/1EDYipCHsUbVmWj1ohoxqU2jinoE1P70H/view?usp=sharing",
  "RSC1": "https://drive.google.com/file/d/1ex6gzD9UTdjm_5D7efgActE7tlr1JfSC/view?usp=sharing",
  "RSC2": "https://drive.google.com/file/d/1FRNDbam1hE2H6aSycdn1i6eUNQLtpR8W/view?usp=sharing",
  "RSC7": "https://drive.google.com/file/d/1ECXqYYFSAVxd4WYEYb19jJ40jaVgWHav/view?usp=sharing",
  "TBC0": "https://drive.google.com/file/d/1V9R_Zu1Nv3qqY_GTKKTY6vh3FhyFzUVP/view?usp=sharing",
  "TBC1": "https://drive.google.com/file/d/1jtLwWug42A8ea8wv6ondaaeWm3bfnAJd/view?usp=sharing",
  "TBC2": "https://drive.google.com/file/d/1G_xAWWdSLWAsrtHJyry3_EU82nV7TYa2/view?usp=sharing",
  "TBC3": "https://drive.google.com/file/d/1SYO3YIZc6bs5SrY6ogWfvAA44y8YRiOW/view?usp=sharing",
  "TBC7": "https://drive.google.com/file/d/1ub-kb_-bvP8gyxyVQHTqBr6PhWOmteCM/view?usp=sharing",
  "TML0": "https://drive.google.com/file/d/1nB_WJ_4U8Iv21Y700RXZuI8_rKVJH-ib/view?usp=sharing",
  "TML1": "https://drive.google.com/file/d/1qCjv6KIX-cxuJn1zrLmZm2RkCsXcL_Se/view?usp=sharing",
  "TML2": "https://drive.google.com/file/d/1UK5pxFtsWpPe7u6BFbi4B4p7O_ig1BOT/view?usp=sharing",
  "TPC1": "https://drive.google.com/file/d/1e3rO8yHZrLBNA0pP8Ifml8FoAxkNXhjk/view?usp=sharing",
  "TPC2": "https://drive.google.com/file/d/1MhWOjZEceQtT6UR2sOdVo24WjifIti_P/view?usp=sharing",
  "TPC7": "https://drive.google.com/file/d/1vwMqOMDJtjMgu94VuQc47IUbzevM4UW_/view?usp=sharing",
  "VHC0": "https://drive.google.com/file/d/1zcc6QXfqQ-M5ACuWCa75xmHQUY4pBK28/view?usp=sharing",
  "VHC1": "https://drive.google.com/file/d/10Xd1dm6dPs7m5898io9ehK93-BH0ADMr/view?usp=sharing",
  "VHC2": "https://drive.google.com/file/d/1xdtlQoKk6mVRbtZRPR7XtC1PmjtOjZAo/view?usp=sharing",
  "VHC3": "https://drive.google.com/file/d/1yqXBl9__cx39tYbVxQHe1B92rAb1le7y/view?usp=sharing",
  "VHC4": "https://drive.google.com/file/d/1bTqvv0fbL_fqbyOLDwhZ1hxLm8T9voBR/view?usp=sharing",
  "VHC5": "https://drive.google.com/file/d/1E9Vazb7GXFO8aID5dtdvwutTWyMQxNHm/view?usp=sharing",
  "VHC7": "https://drive.google.com/file/d/1W8zOu-nzAcL4yttpoimK6vFU3Szj5je5/view?usp=sharing",
  "BPC0": "https://drive.google.com/file/d/1SfMAaCmthHmLKKEjMgDdL_jK7-4j6flj/view?usp=sharing",
  "BPC1": "https://drive.google.com/file/d/1cnayofOGtWRgctuOTxaI7HgvqLFYrDwW/view?usp=sharing",
  "BPC2": "https://drive.google.com/file/d/1TlupW7HoBpVcBLpNCptxNrjTDgoD4yFp/view?usp=sharing",
  "BPC3": "https://drive.google.com/file/d/1xxgatmXPGz9mCSafv18xKZmN5gqAt-2M/view?usp=sharing",
  "BPC4": "https://drive.google.com/file/d/1PUdUfCXn29bOqPuREOjbtZSsSaYL-X8E/view?usp=sharing",
  "BPC7": "https://drive.google.com/file/d/1eDi_p6Kogjwcblzxs2dYnGxKB2LWlFFQ/view?usp=sharing"
};

export function getCameraLocationLink(camera: string, directLink?: string): string | undefined {
  if (directLink && directLink.startsWith('http')) return directLink;
  return MASTER_CAMERA_LOCATIONS[camera];
}

/**
 * Extracts Google Drive file ID from standard sharing and view URLs
 */
export function extractDriveFileId(url?: string): string | null {
  if (!url) return null;
  // Match /file/d/{id}
  const matchFileD = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (matchFileD && matchFileD[1]) return matchFileD[1];

  // Match id={id}
  const matchIdParam = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (matchIdParam && matchIdParam[1]) return matchIdParam[1];

  // Match /d/{id}
  const matchD = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (matchD && matchD[1]) return matchD[1];

  return null;
}

/**
 * Returns a high-resolution direct image CDN URL for embedding in <img> tags
 */
export function getDriveDirectImageUrl(url?: string): string | null {
  const fileId = extractDriveFileId(url);
  if (!fileId) return null;
  return `https://lh3.googleusercontent.com/d/${fileId}=w1600`;
}

/**
 * Returns Google Drive preview URL for <iframe> embedding
 */
export function getDrivePreviewIframeUrl(url?: string): string | null {
  const fileId = extractDriveFileId(url);
  if (!fileId) return null;
  return `https://drive.google.com/file/d/${fileId}/preview`;
}
