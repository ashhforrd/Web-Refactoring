import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createDb } from './client.js';

const db = createDb(fileURLToPath(new URL('../../../relaydesk.db', import.meta.url)));
const now = new Date().toISOString();
const hash = createHash('sha256').update('demo-password').digest('hex');

const tx = db.transaction(() => {
  db.prepare('DELETE FROM outbox').run();
  db.prepare('DELETE FROM comments').run();
  db.prepare('DELETE FROM tickets').run();
  db.prepare('DELETE FROM sessions').run();
  db.prepare('DELETE FROM memberships').run();
  db.prepare('DELETE FROM users').run();
  db.prepare('DELETE FROM workspaces').run();

  db.prepare('INSERT INTO users VALUES(?,?,?,?)').run(
    'usr_maya',
    'maya@example.test',
    'Maya Chen',
    hash,
  );
  db.prepare('INSERT INTO users VALUES(?,?,?,?)').run(
    'usr_noah',
    'noah@example.test',
    'Noah Williams',
    hash,
  );

  db.prepare('INSERT INTO workspaces VALUES(?,?,?)').run('ws_acme', 'Acme Support', 'acme');
  db.prepare('INSERT INTO workspaces VALUES(?,?,?)').run('ws_north', 'Northwind Help', 'northwind');

  db.prepare('INSERT INTO memberships VALUES(?,?,?)').run('usr_maya', 'ws_acme', 'admin');
  db.prepare('INSERT INTO memberships VALUES(?,?,?)').run('usr_noah', 'ws_north', 'admin');

  for (const [id, ws, subject, email, status] of [
    ['t_1', 'ws_acme', 'Invoice shows duplicate charge', 'lee@example.test', 'open'],
    ['t_2', 'ws_acme', 'Cannot export monthly report', 'amina@example.test', 'pending'],
    ['t_3', 'ws_north', 'Update billing contact', 'sam@example.test', 'open'],
  ]) {
    db.prepare('INSERT INTO tickets VALUES(?,?,?,?,?,?,?,?,?,?)').run(
      id,
      ws,
      subject,
      'Customer supplied details are recorded here.',
      email,
      status,
      'normal',
      null,
      now,
      now,
    );
  }

  db.prepare('INSERT INTO comments VALUES(?,?,?,?,?,?)').run(
    'c_1',
    't_1',
    'usr_maya',
    'Investigating with billing.',
    0,
    now,
  );
});

tx();

console.log('Seeded RelayDesk');
