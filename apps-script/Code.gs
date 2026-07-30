// ============================================================
// 2027 IPP Portal — Apps Script Backend
// Sheet ID: 1tiP3qFDvK_MZgnZpHK-CEkRSO1X-ist-84EmQKIekxw
// ============================================================

var SHEET_ID = '1tiP3qFDvK_MZgnZpHK-CEkRSO1X-ist-84EmQKIekxw';

// Tab names — must match actual sheet tab labels (fuzzy-matched below)
var TAB = {
  WORKBACK_27:  'Workback Plan 2027 - July v1',
  WORKBACK_26:  'Workback Plan 2026 v2',
  RAID_LOG:     'RAID Log',
  RAID_SUMMARY: 'RAID Summary',
  TEAM:         'R&R',
  ROLES:        'Roles and Responsibilities',
};

var CHAT_WEBHOOK_PROP = 'CHAT_WEBHOOK_URL';

// ---- Web app entry point ----
function doGet() {
  var tmpl = HtmlService.createTemplateFromFile('Tracker');
  tmpl.data = getPortalData();
  return tmpl.evaluate()
    .setTitle('2027 IPP Portal')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ---- Master data bundle served to the frontend ----
function getPortalData() {
  try {
    var ss = SpreadsheetApp.openById(SHEET_ID);
    return {
      workback:    getWorkback(ss),
      raid:        getRaid(ss),
      team:        getTeam(ss),
      summary:     getSummaryStats(ss),
      isAdmin:     isAdminUser(),
      lastUpdated: new Date().toISOString(),
    };
  } catch (e) {
    Logger.log('getPortalData error: ' + e);
    return { error: e.toString(), workback: [], raid: [], team: [] };
  }
}

// ---- Workback Plan 2027 ----
// Columns: MILESTONE | DEPENDENCIES | RESPONSIBLE | OWNER(S) | STATUS | START | END | Duration | Comments | | Executive Approvals
function getWorkback(ss) {
  var sheet = getSheet(ss, TAB.WORKBACK_27) || getSheet(ss, TAB.WORKBACK_26);
  if (!sheet) return [];
  var rows = sheetToObjects(sheet, true);
  var today = new Date();
  today.setHours(0, 0, 0, 0);

  return rows.filter(function(r) {
    return r['MILESTONE'] || r['Task'] || r['Activity'];
  }).map(function(r) {
    var task       = r['MILESTONE'] || r['Task'] || r['Activity'] || '';
    var owner      = r['RESPONSIBLE'] || r['OWNER(S)'] || r['Owner'] || r['DRI'] || '';
    var startRaw   = r['START'] || r['Start Date'] || r['Start'] || '';
    var endRaw     = r['END'] || r['End Date'] || r['Due Date'] || r['Target Date'] || '';
    var status     = normalizeStatus(r['STATUS'] || r['Status'] || '');
    var workstream = r['DEPENDENCIES'] || r['Workstream'] || '';
    var due        = parseDate(endRaw);
    var daysLeft   = due ? Math.round((due - today) / 86400000) : null;
    return {
      task:       task,
      workstream: workstream,
      owner:      owner,
      startDate:  startRaw,
      dueDate:    due ? formatDate(due) : endRaw,
      dueDateISO: due ? Utilities.formatDate(due, 'UTC', 'yyyy-MM-dd') : '',
      status:     status,
      daysLeft:   daysLeft,
      notes:      r['Comments'] || r['Notes'] || '',
      rowIndex:   r._rowIndex,
    };
  });
}

// ---- RAID Log ----
// Columns: Identifier | RAID Category | Impacted Team | Description | Priority | Date Identified | Created by | Next Step | Due Date for Next Step | Date Closed | Owner | Decision Maker
function getRaid(ss) {
  var sheet = getSheet(ss, TAB.RAID_LOG) || getSheet(ss, TAB.RAID_SUMMARY);
  if (!sheet) return [];
  var rows = sheetToObjects(sheet);

  return rows.filter(function(r) {
    return r['Description'] || r['Title'] || r['Risk'] || r['Issue'];
  }).map(function(r) {
    var title    = r['Description'] || r['Title'] || r['Risk'] || r['Issue'] || '';
    var type     = r['RAID Category'] || r['Type'] || r['Category'] || 'Action';
    var severity = r['Priority'] || r['Severity'] || r['Impact'] || '';
    var closed   = r['Date Closed'] || '';
    var status   = (closed && String(closed).trim() !== '') ? 'CLOSED' : 'OPEN';
    var owner    = r['Owner'] || r['Responsible'] || r['Decision Maker'] || '';
    var notes    = r['Next Step'] || r['Notes'] || r['Mitigation'] || '';
    return {
      title:    title,
      type:     type,
      severity: severity,
      status:   status,
      owner:    owner,
      notes:    notes,
    };
  });
}

// ---- Program Team (R&R tab, rows 1-26) ----
// Col A: category/stream  Col B: owner(s)  Col C: others associated
// Main group headers: Core Working Group | Team | IPP Workstream
function getTeam(ss) {
  var sheet = getSheet(ss, TAB.TEAM) || getSheet(ss, TAB.ROLES);
  if (!sheet) return [];

  var lastRow = Math.min(26, sheet.getLastRow());
  if (lastRow < 1) return [];
  var data = sheet.getRange(1, 1, lastRow, 3).getValues();

  var MAIN_GROUPS = ['CORE WORKING GROUP', 'TEAM', 'IPP WORKSTREAM'];
  var currentGroup = '';
  var members = [];

  data.forEach(function(row) {
    var colA = String(row[0] || '').trim();
    var colB = String(row[1] || '').trim();
    var colC = String(row[2] || '').trim();
    if (!colA && !colB && !colC) return;

    // Detect a main group header in col A
    var upperA = colA.toUpperCase().replace(/[^A-Z ]/g, '').trim();
    var isGroup = MAIN_GROUPS.some(function(g) { return upperA === g || upperA.indexOf(g) > -1; });
    if (isGroup) { currentGroup = colA; return; }

    var owners = colB ? colB.split(/[,\n;]+/).map(function(n) { return n.trim(); }).filter(Boolean) : [];
    var others = colC ? colC.split(/[,\n;]+/).map(function(n) { return n.trim(); }).filter(Boolean) : [];
    if (!colA && !owners.length) return;

    members.push({ group: currentGroup || 'General', stream: colA, owners: owners, others: others });
  });

  return members;
}

// ---- Summary stats (workback-based) ----
function getSummaryStats(ss) {
  var workback = getWorkback(ss);
  var raid     = getRaid(ss);

  var totalW   = workback.length;
  var doneW    = workback.filter(function(w) { return w.status === 'COMPLETE'; }).length;
  var overdueW = workback.filter(function(w) {
    return w.daysLeft !== null && w.daysLeft < 0 && w.status !== 'COMPLETE';
  }).length;
  var openRaid = raid.filter(function(r) { return r.status !== 'CLOSED'; }).length;

  return {
    workbackTotal:    totalW,
    workbackComplete: doneW,
    workbackOverdue:  overdueW,
    openRaidItems:    openRaid,
    pctComplete:      totalW > 0 ? Math.round(doneW / totalW * 100) : 0,
  };
}

// ---- Add new RAID item (appends row to RAID Log tab) ----
function addRaidItem(item) {
  try {
    var ss    = SpreadsheetApp.openById(SHEET_ID);
    var sheet = getSheet(ss, TAB.RAID_LOG);
    if (!sheet) return { success: false, error: 'RAID Log tab not found' };

    var nextId = sheet.getLastRow();
    var user   = '';
    try { user = Session.getActiveUser().getEmail(); } catch(e) {}

    // Columns: Identifier | RAID Category | Impacted Team | Description | Priority |
    //          Date Identified | Created by | Next Step | Due Date for Next Step |
    //          Date Closed | Owner | Decision Maker
    sheet.appendRow([
      nextId,
      item.raidCategory || '',
      item.impactedTeam || '',
      item.description  || '',
      item.priority     || '',
      new Date(),
      user,
      item.nextStep     || '',
      '',
      '',
      item.owner        || '',
      '',
    ]);

    sendChatNotification(
      '🔴 *New RAID Item Added*\n' +
      '*' + (item.description || '') + '*\n' +
      'Category: ' + (item.raidCategory || '—') + '  |  ' +
      'Priority: ' + (item.priority || '—') + '  |  ' +
      'Owner: ' + (item.owner || '—') + '\n' +
      'Next step: ' + (item.nextStep || '—')
    );

    return { success: true };
  } catch (e) {
    Logger.log('addRaidItem error: ' + e);
    return { success: false, error: e.toString() };
  }
}

// ---- Add new milestone (appends row to Workback Plan 2027 tab) ----
function addMilestone(item) {
  try {
    var ss    = SpreadsheetApp.openById(SHEET_ID);
    var sheet = getSheet(ss, TAB.WORKBACK_27);
    if (!sheet) return { success: false, error: 'Workback Plan 2027 tab not found' };

    // Columns: MILESTONE | DEPENDENCIES | RESPONSIBLE | OWNER(S) | STATUS | START | END | Duration | Comments | | Executive Approvals
    sheet.appendRow([
      item.milestone    || '',
      item.dependencies || '',
      item.responsible  || '',
      item.owners       || '',
      item.status       || 'PENDING',
      item.start        || '',
      item.end          || '',
      '',
      item.comments     || '',
      '',
      '',
    ]);

    sendChatNotification(
      '📌 *New Milestone Added*\n' +
      '*' + (item.milestone || '') + '*\n' +
      'Due: ' + (item.end || '—') + '  |  ' +
      'Owner: ' + (item.responsible || item.owners || '—') + '  |  ' +
      'Status: ' + (item.status || 'PENDING')
    );

    return { success: true };
  } catch (e) {
    Logger.log('addMilestone error: ' + e);
    return { success: false, error: e.toString() };
  }
}

// ---- Update workback item status in-place ----
function updateWorkbackStatus(rowIndex, newStatus) {
  try {
    var ss    = SpreadsheetApp.openById(SHEET_ID);
    var sheet = getSheet(ss, TAB.WORKBACK_27) || getSheet(ss, TAB.WORKBACK_26);
    if (!sheet) return { success: false, error: 'Workback tab not found' };

    // Locate STATUS column in the header row
    var data      = sheet.getDataRange().getValues();
    var headerIdx = 0;
    for (var i = 0; i < Math.min(data.length, 10); i++) {
      if (data[i].filter(function(c) { return c !== '' && c !== null && c !== undefined; }).length >= 2) {
        headerIdx = i; break;
      }
    }
    var statusCol = -1;
    data[headerIdx].forEach(function(h, j) {
      if (String(h).trim().toUpperCase() === 'STATUS') statusCol = j + 1;
    });
    if (statusCol < 0) return { success: false, error: 'STATUS column not found' };

    sheet.getRange(rowIndex, statusCol).setValue(newStatus);
    return { success: true };
  } catch (e) {
    Logger.log('updateWorkbackStatus error: ' + e);
    return { success: false, error: e.toString() };
  }
}

// ---- Google Chat webhook notification ----
function sendChatNotification(message) {
  var props = PropertiesService.getScriptProperties();
  var url   = props.getProperty(CHAT_WEBHOOK_PROP);
  if (!url) {
    Logger.log('CHAT_WEBHOOK_URL not set in Script Properties');
    return { success: false, error: 'Webhook URL not configured' };
  }
  try {
    var response = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({ text: message }),
      muteHttpExceptions: true,
    });
    return { success: response.getResponseCode() === 200 };
  } catch (e) {
    Logger.log('sendChatNotification error: ' + e);
    return { success: false, error: e.toString() };
  }
}

// ---- Daily trigger: alert on overdue workback items ----
function checkOverdueItems() {
  var ss    = SpreadsheetApp.openById(SHEET_ID);
  var items = getWorkback(ss).filter(function(w) {
    return w.daysLeft !== null && w.daysLeft < 0 && w.status !== 'COMPLETE';
  });
  if (!items.length) return;

  var lines = items.map(function(w) {
    return '• *' + w.task + '* — ' + Math.abs(w.daysLeft) + ' day(s) overdue (Owner: ' + (w.owner || 'TBD') + ')';
  });
  sendChatNotification(
    '⚠️ *2027 IPP Portal — Overdue Items*\n\n' + lines.join('\n') +
    '\n\nReview: ' + getPortalUrl()
  );
}

// ---- Install daily trigger ----
function installDailyTrigger() {
  deleteTriggers('checkOverdueItems');
  ScriptApp.newTrigger('checkOverdueItems')
    .timeBased().everyDays(1).atHour(8).create();
  Logger.log('Daily trigger installed for checkOverdueItems at 8am');
}

function deleteTriggers(functionName) {
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === functionName) ScriptApp.deleteTrigger(t);
  });
}

// ---- Admin check ----
function isAdminUser() {
  try {
    var email  = Session.getActiveUser().getEmail();
    var admins = (PropertiesService.getScriptProperties().getProperty('ADMIN_EMAILS') || '')
                   .split(',').map(function(e) { return e.trim().toLowerCase(); });
    return admins.indexOf(email.toLowerCase()) > -1;
  } catch (e) {
    return false;
  }
}

// ---- Debug: lists all tab names and first 5 rows of each target tab ----
function debugSheetInfo() {
  var ss     = SpreadsheetApp.openById(SHEET_ID);
  var result = { allTabs: ss.getSheets().map(function(s) { return s.getName(); }), targets: {} };
  Object.keys(TAB).forEach(function(key) {
    var sheet = getSheet(ss, TAB[key]);
    if (sheet) {
      var numRows = Math.min(5, sheet.getLastRow());
      var numCols = Math.min(12, sheet.getLastColumn());
      result.targets[key] = { found: sheet.getName(), first5rows: sheet.getRange(1, 1, numRows, numCols).getValues() };
    } else {
      result.targets[key] = { found: null, looking_for: TAB[key] };
    }
  });
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

// ---- Helpers ----
function getSheet(ss, name) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    var slug = name.replace(/[^a-z0-9]/gi, '').toLowerCase();
    ss.getSheets().forEach(function(s) {
      if (!sheet && s.getName().replace(/[^a-z0-9]/gi, '').toLowerCase() === slug) sheet = s;
    });
  }
  return sheet;
}

function sheetToObjects(sheet, withRowIndex) {
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  // Skip title rows — find first row with at least 2 non-empty cells
  var headerIdx = 0;
  for (var i = 0; i < Math.min(data.length, 10); i++) {
    if (data[i].filter(function(c) { return c !== '' && c !== null && c !== undefined; }).length >= 2) {
      headerIdx = i; break;
    }
  }
  var headers = data[headerIdx].map(function(h) { return String(h).trim(); });
  return data.slice(headerIdx + 1).map(function(row, idx) {
    var obj = {};
    headers.forEach(function(h, i) { obj[h] = row[i]; });
    if (withRowIndex) obj._rowIndex = headerIdx + idx + 2; // 1-based sheet row
    return obj;
  }).filter(function(r) {
    return Object.values(r).some(function(v) { return v !== '' && v !== null && v !== undefined; });
  });
}

function normalizeStatus(raw) {
  var s = String(raw).trim().toUpperCase();
  if (!s || s === 'N/A' || s === '-') return 'PENDING';
  if (/COMPLET|DONE|CLOSED|FINISH/.test(s)) return 'COMPLETE';
  if (/PROGRESS|ACTIVE|STARTED|IN.PROG/.test(s)) return 'IN PROGRESS';
  if (/OVER|LATE|MISS/.test(s)) return 'OVERDUE';
  if (/BLOCK|HOLD|RISK/.test(s)) return 'AT RISK';
  if (/CANCEL/.test(s)) return 'CANCELLED';
  return 'PENDING';
}

function parseDate(val) {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  var d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

function formatDate(d) {
  if (!d) return '';
  var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
}

function getPortalUrl() {
  try { return ScriptApp.getService().getUrl(); } catch(e) { return 'https://script.google.com'; }
}
