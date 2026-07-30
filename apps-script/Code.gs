// ============================================================
// 2027 IPP Portal — Apps Script Backend
// Sheet ID: 1tiP3qFDvK_MZgnZpHK-CEkRSO1X-ist-84EmQKIekxw
// ============================================================

var SHEET_ID = '1tiP3qFDvK_MZgnZpHK-CEkRSO1X-ist-84EmQKIekxw';

// Tab names — must match the actual sheet tab labels exactly (fuzzy-matched below)
var TAB = {
  GOVERNANCE:   'Governace Calendar',
  WORKBACK_27:  'Workback Plan 2027 - July v1',
  WORKBACK_26:  'Workback_Plan_2026_v2',
  RAID_LOG:     'RAID Log',
  RAID_SUMMARY: 'RAID_Summary',
  TEAM:         'R&R',
  ROLES:        'Roles_and_Responsibilities',
};

// Script Properties key for the Google Chat webhook URL.
// Set via: File → Project properties → Script properties → CHAT_WEBHOOK_URL
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
      milestones:  getMilestones(ss),
      workback:    getWorkback(ss),
      raid:        getRaid(ss),
      team:        getTeam(ss),
      summary:     getSummaryStats(ss),
      isAdmin:     isAdminUser(),
      lastUpdated: new Date().toISOString(),
    };
  } catch (e) {
    Logger.log('getPortalData error: ' + e);
    return { error: e.toString(), milestones: [], workback: [], raid: [], team: [] };
  }
}

// ---- Governance Calendar: key milestones ----
function getMilestones(ss) {
  var sheet = getSheet(ss, TAB.GOVERNANCE);
  if (!sheet) return [];
  var rows = sheetToObjects(sheet);
  var today = new Date();
  today.setHours(0, 0, 0, 0);

  return rows.filter(function(r) {
    return r['Milestone'] || r['Task'] || r['Activity'];
  }).map(function(r) {
    var name    = r['Milestone'] || r['Task'] || r['Activity'] || '';
    var owner   = r['Owner'] || r['Responsible'] || '';
    var dueRaw  = r['Target Date'] || r['Due Date'] || r['Date'] || '';
    var status  = normalizeStatus(r['Status'] || '');
    var due     = parseDate(dueRaw);
    var daysLeft = due ? Math.round((due - today) / 86400000) : null;
    return {
      name:       name,
      owner:      owner,
      dueDate:    due ? formatDate(due) : dueRaw,
      dueDateISO: due ? Utilities.formatDate(due, 'UTC', 'yyyy-MM-dd') : '',
      status:     status,
      daysLeft:   daysLeft,
      notes:      r['Notes'] || r['Comments'] || '',
    };
  });
}

// ---- Workback Plan 2027 ----
function getWorkback(ss) {
  var sheet = getSheet(ss, TAB.WORKBACK_27) || getSheet(ss, TAB.WORKBACK_26);
  if (!sheet) return [];
  var rows = sheetToObjects(sheet);
  var today = new Date();
  today.setHours(0, 0, 0, 0);

  return rows.filter(function(r) {
    return r['MILESTONE'] || r['Task'] || r['Activity'];
  }).map(function(r) {
    var task      = r['MILESTONE'] || r['Task'] || r['Activity'] || '';
    var owner     = r['RESPONSIBLE'] || r['OWNER(S)'] || r['Owner'] || r['DRI'] || '';
    var startRaw  = r['START'] || r['Start Date'] || r['Start'] || '';
    var endRaw    = r['END'] || r['End Date'] || r['Due Date'] || r['Target Date'] || '';
    var status    = normalizeStatus(r['STATUS'] || r['Status'] || '');
    var workstream = r['DEPENDENCIES'] || r['Workstream'] || '';
    var due       = parseDate(endRaw);
    var daysLeft  = due ? Math.round((due - today) / 86400000) : null;
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
    };
  });
}

// ---- RAID Log ----
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
    // Derive status from Date Closed field
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

// ---- Program Team (sourced from Roles and Responsibilities tab) ----
// Columns: Abbreviation | Group | Group Leader(s)
function getTeam(ss) {
  var sheet = getSheet(ss, TAB.ROLES) || getSheet(ss, TAB.TEAM);
  if (!sheet) return [];
  var rows = sheetToObjects(sheet);

  var members = [];
  rows.filter(function(r) {
    return r['Group'] || r['Group Leader(s)'];
  }).forEach(function(r) {
    var group  = String(r['Group'] || '').trim();
    var abbr   = String(r['Abbreviation'] || '').trim();
    var leaders = String(r['Group Leader(s)'] || '').trim();
    if (!leaders) return;
    // Each comma/newline-separated leader becomes their own card
    leaders.split(/[,\n]+/).forEach(function(name) {
      name = name.trim();
      if (name) {
        members.push({
          name:  name,
          role:  group,
          email: '',
          team:  abbr,
        });
      }
    });
  });
  return members;
}

// ---- Summary stats for the hero section ----
function getSummaryStats(ss) {
  var milestones = getMilestones(ss);
  var workback   = getWorkback(ss);
  var raid       = getRaid(ss);
  var today      = new Date(); today.setHours(0,0,0,0);

  var totalM   = milestones.length;
  var doneM    = milestones.filter(function(m){ return m.status === 'COMPLETE'; }).length;
  var overdueM = milestones.filter(function(m){
    return m.daysLeft !== null && m.daysLeft < 0 && m.status !== 'COMPLETE';
  }).length;

  var totalW   = workback.length;
  var doneW    = workback.filter(function(w){ return w.status === 'COMPLETE'; }).length;

  var openRaid = raid.filter(function(r){ return r.status !== 'CLOSED' && r.status !== 'COMPLETE'; }).length;

  return {
    milestonesTotal:    totalM,
    milestonesComplete: doneM,
    milestonesOverdue:  overdueM,
    workbackTotal:      totalW,
    workbackComplete:   doneW,
    openRaidItems:      openRaid,
    pctComplete:        totalM > 0 ? Math.round(doneM / totalM * 100) : 0,
  };
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
    var payload = JSON.stringify({ text: message });
    var options = {
      method: 'post',
      contentType: 'application/json',
      payload: payload,
      muteHttpExceptions: true,
    };
    var response = UrlFetchApp.fetch(url, options);
    return { success: response.getResponseCode() === 200 };
  } catch (e) {
    Logger.log('sendChatNotification error: ' + e);
    return { success: false, error: e.toString() };
  }
}

// ---- Daily trigger: check for overdue milestones ----
function checkMilestones() {
  var ss    = SpreadsheetApp.openById(SHEET_ID);
  var items = getMilestones(ss).filter(function(m) {
    return m.daysLeft !== null && m.daysLeft < 0 && m.status !== 'COMPLETE';
  });
  if (!items.length) return;

  var lines = items.map(function(m) {
    return '• *' + m.name + '* — ' + Math.abs(m.daysLeft) + ' day(s) overdue (Owner: ' + (m.owner || 'TBD') + ')';
  });
  var msg = '⚠️ *2027 IPP Portal — Overdue Milestone Alert*\n\n' + lines.join('\n') +
    '\n\nReview: ' + getPortalUrl();
  sendChatNotification(msg);
}

// ---- Debug: run this from the Apps Script editor to see tab names and headers ----
function debugSheetInfo() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var result = { allTabs: [], targets: {} };

  // List every tab name
  result.allTabs = ss.getSheets().map(function(s) { return s.getName(); });

  // For each target tab, show the first 5 rows so we can see past title rows
  Object.keys(TAB).forEach(function(key) {
    var sheet = getSheet(ss, TAB[key]);
    if (sheet) {
      var numRows = Math.min(5, sheet.getLastRow());
      var numCols = Math.min(12, sheet.getLastColumn());
      var rows = sheet.getRange(1, 1, numRows, numCols).getValues();
      result.targets[key] = { found: sheet.getName(), first5rows: rows };
    } else {
      result.targets[key] = { found: null, looking_for: TAB[key] };
    }
  });

  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

// ---- Install / remove daily time-driven trigger ----
function installDailyTrigger() {
  deleteTriggers('checkMilestones');
  ScriptApp.newTrigger('checkMilestones')
    .timeBased()
    .everyDays(1)
    .atHour(8)
    .create();
  Logger.log('Daily trigger installed for checkMilestones at 8am');
}

function deleteTriggers(functionName) {
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === functionName) ScriptApp.deleteTrigger(t);
  });
}

// ---- Admin check ----
function isAdminUser() {
  try {
    var email = Session.getActiveUser().getEmail();
    var props = PropertiesService.getScriptProperties();
    var admins = (props.getProperty('ADMIN_EMAILS') || '').split(',').map(function(e) { return e.trim().toLowerCase(); });
    return admins.indexOf(email.toLowerCase()) > -1;
  } catch (e) {
    return false;
  }
}

// ---- Helpers ----
function getSheet(ss, name) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    // Fuzzy match: strip all non-alphanumeric chars and compare lowercase
    var slug = name.replace(/[^a-z0-9]/gi, '').toLowerCase();
    ss.getSheets().forEach(function(s) {
      if (!sheet && s.getName().replace(/[^a-z0-9]/gi, '').toLowerCase() === slug) sheet = s;
    });
  }
  return sheet;
}

function sheetToObjects(sheet) {
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];

  // Skip title/merged rows — find first row with at least 2 non-empty cells
  var headerIdx = 0;
  for (var i = 0; i < Math.min(data.length, 10); i++) {
    var nonEmpty = data[i].filter(function(c) {
      return c !== '' && c !== null && c !== undefined;
    }).length;
    if (nonEmpty >= 2) { headerIdx = i; break; }
  }

  var headers = data[headerIdx].map(function(h) { return String(h).trim(); });
  return data.slice(headerIdx + 1).map(function(row) {
    var obj = {};
    headers.forEach(function(h, i) { obj[h] = row[i]; });
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
  try {
    return ScriptApp.getService().getUrl();
  } catch (e) {
    return 'https://script.google.com';
  }
}
