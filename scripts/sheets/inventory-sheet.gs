/**
 * Phone-farm production sheet: fills "Have" from the dashboard every hour and
 * works out "Need to produce" (Garreth, 2026-10-05).
 *
 * Lives in the sheet's own Apps Script (Extensions → Apps Script), not in the
 * app. Kept here so it is versioned.
 *
 * Setup, once:
 *   1. Put the dashboard's SHEET_INVENTORY_TOKEN (from Vercel) in TOKEN below.
 *      Never commit the filled-in copy; this file keeps the placeholder.
 *   2. Paste it into the sheet's Apps Script editor and save.
 *   3. Run `setup` once and allow access. It fills the columns now and every
 *      hour after.
 *
 * Only the sheet's editors can see the script. The token opens the stock
 * counts and nothing else.
 *
 * Columns are found by their header text in row 1, so they can be moved.
 *   Supabase Table            read: which table a row is
 *   Amount Posting per week   read: the cadence, typed by hand
 *   Have                      written: approved, not yet given to an account
 *   Need to produce           written: a formula, posts per week × 2 − Have
 */

const TOKEN = 'PASTE_TOKEN_HERE';
const DASHBOARD_URL = 'https://pm-dashboard-ashen.vercel.app/api/sheet-inventory';
const TAB_ID = 588863603;
const WEEKS_OF_BUFFER = 2;

function setup() {
  ScriptApp.getProjectTriggers()
    .filter((t) => t.getHandlerFunction() === 'refreshInventory')
    .forEach((t) => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('refreshInventory').timeBased().everyHours(1).create();
  refreshInventory();
}

function refreshInventory() {
  if (TOKEN === 'PASTE_TOKEN_HERE') throw new Error('Put the dashboard token in TOKEN at the top of the script.');

  const res = UrlFetchApp.fetch(DASHBOARD_URL, {
    headers: { Authorization: 'Bearer ' + TOKEN },
    muteHttpExceptions: true,
  });
  if (res.getResponseCode() !== 200) {
    throw new Error('Dashboard answered ' + res.getResponseCode() + ': ' + res.getContentText().slice(0, 200));
  }
  const body = JSON.parse(res.getContentText());
  const haveByTable = {};
  body.lanes.forEach((l) => (haveByTable[l.table] = l.have));

  const sheet = SpreadsheetApp.getActive().getSheets().find((s) => s.getSheetId() === TAB_ID);
  if (!sheet) throw new Error('The inventory tab is gone (id ' + TAB_ID + ').');

  const col = (name) => headers().indexOf(name.toLowerCase()) + 1;
  const headers = () =>
    sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map((h) => String(h).trim().toLowerCase());
  const ensure = (name) => {
    if (col(name)) return col(name);
    const c = sheet.getLastColumn() + 1;
    sheet.getRange(1, c).setValue(name);
    return c;
  };

  const tableCol = col('Supabase Table');
  const cadenceCol = col('Amount Posting per week');
  if (!tableCol || !cadenceCol) throw new Error('Row 1 needs "Supabase Table" and "Amount Posting per week".');
  const haveCol = ensure('Have');
  const needCol = ensure('Need to produce');

  const last = sheet.getLastRow();
  if (last < 2) return;
  const tables = sheet.getRange(2, tableCol, last - 1, 1).getValues();
  const cadenceA1 = (r) => sheet.getRange(r, cadenceCol).getA1Notation();
  const haveA1 = (r) => sheet.getRange(r, haveCol).getA1Notation();

  tables.forEach(([table], i) => {
    const r = i + 2;
    const name = String(table).trim();
    if (!name) return;
    // A table the dashboard does not know reads blank, never 0: 0 would claim
    // there is nothing in stock.
    sheet.getRange(r, haveCol).setValue(name in haveByTable ? haveByTable[name] : '');
    sheet
      .getRange(r, needCol)
      .setFormula(
        '=IF(' + haveA1(r) + '="","",MAX(0,' + cadenceA1(r) + '*' + WEEKS_OF_BUFFER + '-' + haveA1(r) + '))',
      );
  });

  const stamp = Utilities.formatDate(new Date(), 'America/New_York', 'MMM d, h:mm a');
  sheet.getRange(1, haveCol).setNote('Updated ' + stamp + ' ET from the dashboard.');
}
