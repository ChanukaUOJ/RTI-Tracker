import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { pool } from './db.js';
import { normalizePagination, paginationMeta } from './pagination.js';

const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

// --- Helpers
async function countAll(tableName) {
  const { rows } = await pool.query(`SELECT COUNT(*)::int AS count FROM ${tableName}`);
  return rows[0]?.count ?? 0;
}

// --- Senders
app.get('/api/senders', asyncHandler(async (req, res) => {
  const { page, pageSize, offset, limit } = normalizePagination(req.query);
  const totalItems = await countAll('senders');
  const { rows } = await pool.query(
    `SELECT id, name, email, address, contact_no AS "contactNo", created_at AS "createdAt", updated_at AS "updatedAt"
     FROM senders
     ORDER BY updated_at DESC
     OFFSET $1 LIMIT $2`,
    [offset, limit]
  );
  res.json({ data: rows, pagination: paginationMeta({ page, pageSize, totalItems }) });
}));

app.post('/api/senders', asyncHandler(async (req, res) => {
  const { name, email, address, contactNo } = req.body ?? {};
  if (!name) return res.status(422).json({ message: 'name is required' });
  if (!email && !contactNo) return res.status(422).json({ message: 'email or contactNo is required' });

  const { rows } = await pool.query(
    `INSERT INTO senders (name, email, address, contact_no)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, email, address, contact_no AS "contactNo", created_at AS "createdAt", updated_at AS "updatedAt"`,
    [name, email ?? null, address ?? null, contactNo ?? null]
  );
  res.status(201).json(rows[0]);
}));

app.put('/api/senders/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, email, address, contactNo } = req.body ?? {};

  const { rows } = await pool.query(
    `UPDATE senders
     SET
       name = COALESCE($2, name),
       email = $3,
       address = $4,
       contact_no = $5,
       updated_at = NOW()
     WHERE id = $1
     RETURNING id, name, email, address, contact_no AS "contactNo", created_at AS "createdAt", updated_at AS "updatedAt"`,
    [id, name ?? null, email ?? null, address ?? null, contactNo ?? null]
  );
  if (!rows[0]) return res.status(404).json({ message: 'Sender not found' });
  if (!rows[0].email && !rows[0].contactNo) return res.status(422).json({ message: 'email or contactNo is required' });
  res.json(rows[0]);
}));

app.delete('/api/senders/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { rowCount } = await pool.query(`DELETE FROM senders WHERE id = $1`, [id]);
  if (!rowCount) return res.status(404).json({ message: 'Sender not found' });
  res.status(204).send();
}));

// --- Positions
app.get('/api/positions', asyncHandler(async (req, res) => {
  const { page, pageSize, offset, limit } = normalizePagination(req.query);
  const totalItems = await countAll('positions');
  const { rows } = await pool.query(
    `SELECT id, name, created_at AS "createdAt", updated_at AS "updatedAt"
     FROM positions
     ORDER BY name ASC
     OFFSET $1 LIMIT $2`,
    [offset, limit]
  );
  res.json({ data: rows, pagination: paginationMeta({ page, pageSize, totalItems }) });
}));

app.post('/api/positions', asyncHandler(async (req, res) => {
  const { name } = req.body ?? {};
  if (!name) return res.status(422).json({ message: 'name is required' });
  const { rows } = await pool.query(
    `INSERT INTO positions (name) VALUES ($1)
     RETURNING id, name, created_at AS "createdAt", updated_at AS "updatedAt"`,
    [name]
  );
  res.status(201).json(rows[0]);
}));

app.put('/api/positions/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name } = req.body ?? {};
  if (!name) return res.status(422).json({ message: 'name is required' });
  const { rows } = await pool.query(
    `UPDATE positions SET name = $2, updated_at = NOW()
     WHERE id = $1
     RETURNING id, name, created_at AS "createdAt", updated_at AS "updatedAt"`,
    [id, name]
  );
  if (!rows[0]) return res.status(404).json({ message: 'Position not found' });
  res.json(rows[0]);
}));

app.delete('/api/positions/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { rowCount } = await pool.query(`DELETE FROM positions WHERE id = $1`, [id]);
  if (!rowCount) return res.status(404).json({ message: 'Position not found' });
  res.status(204).send();
}));

// --- Institutions
app.get('/api/institutions', asyncHandler(async (req, res) => {
  const { page, pageSize, offset, limit } = normalizePagination(req.query);
  const totalItems = await countAll('institutions');
  const { rows } = await pool.query(
    `SELECT id, name, created_at AS "createdAt", updated_at AS "updatedAt"
     FROM institutions
     ORDER BY name ASC
     OFFSET $1 LIMIT $2`,
    [offset, limit]
  );
  res.json({ data: rows, pagination: paginationMeta({ page, pageSize, totalItems }) });
}));

app.post('/api/institutions', asyncHandler(async (req, res) => {
  const { name } = req.body ?? {};
  if (!name) return res.status(422).json({ message: 'name is required' });
  const { rows } = await pool.query(
    `INSERT INTO institutions (name) VALUES ($1)
     RETURNING id, name, created_at AS "createdAt", updated_at AS "updatedAt"`,
    [name]
  );
  res.status(201).json(rows[0]);
}));

app.put('/api/institutions/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name } = req.body ?? {};
  if (!name) return res.status(422).json({ message: 'name is required' });
  const { rows } = await pool.query(
    `UPDATE institutions SET name = $2, updated_at = NOW()
     WHERE id = $1
     RETURNING id, name, created_at AS "createdAt", updated_at AS "updatedAt"`,
    [id, name]
  );
  if (!rows[0]) return res.status(404).json({ message: 'Institution not found' });
  res.json(rows[0]);
}));

app.delete('/api/institutions/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { rowCount } = await pool.query(`DELETE FROM institutions WHERE id = $1`, [id]);
  if (!rowCount) return res.status(404).json({ message: 'Institution not found' });
  res.status(204).send();
}));

// --- Receivers
app.get('/api/receivers', asyncHandler(async (req, res) => {
  const { page, pageSize, offset, limit } = normalizePagination(req.query);
  const totalItems = await countAll('receivers');
  const { rows } = await pool.query(
    `SELECT
       r.id,
       r.position_id AS "positionId",
       p.name AS "positionName",
       r.institution_id AS "institutionId",
       i.name AS "institutionName",
       r.email,
       r.address,
       r.contact_no AS "contactNo",
       r.created_at AS "createdAt",
       r.updated_at AS "updatedAt"
     FROM receivers r
     JOIN positions p ON p.id = r.position_id
     JOIN institutions i ON i.id = r.institution_id
     ORDER BY r.updated_at DESC
     OFFSET $1 LIMIT $2`,
    [offset, limit]
  );
  res.json({ data: rows, pagination: paginationMeta({ page, pageSize, totalItems }) });
}));

app.post('/api/receivers', asyncHandler(async (req, res) => {
  const { positionId, institutionId, email, address, contactNo } = req.body ?? {};
  if (!positionId) return res.status(422).json({ message: 'positionId is required' });
  if (!institutionId) return res.status(422).json({ message: 'institutionId is required' });
  if (!email && !contactNo) return res.status(422).json({ message: 'email or contactNo is required' });

  const { rows } = await pool.query(
    `INSERT INTO receivers (position_id, institution_id, email, address, contact_no)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, position_id AS "positionId", institution_id AS "institutionId", email, address, contact_no AS "contactNo", created_at AS "createdAt", updated_at AS "updatedAt"`,
    [positionId, institutionId, email ?? null, address ?? null, contactNo ?? null]
  );
  res.status(201).json(rows[0]);
}));

app.put('/api/receivers/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { positionId, institutionId, email, address, contactNo } = req.body ?? {};
  const { rows } = await pool.query(
    `UPDATE receivers
     SET
       position_id = COALESCE($2, position_id),
       institution_id = COALESCE($3, institution_id),
       email = $4,
       address = $5,
       contact_no = $6,
       updated_at = NOW()
     WHERE id = $1
     RETURNING id, position_id AS "positionId", institution_id AS "institutionId", email, address, contact_no AS "contactNo", created_at AS "createdAt", updated_at AS "updatedAt"`,
    [id, positionId ?? null, institutionId ?? null, email ?? null, address ?? null, contactNo ?? null]
  );
  if (!rows[0]) return res.status(404).json({ message: 'Receiver not found' });
  if (!rows[0].email && !rows[0].contactNo) return res.status(422).json({ message: 'email or contactNo is required' });
  res.json(rows[0]);
}));

app.delete('/api/receivers/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { rowCount } = await pool.query(`DELETE FROM receivers WHERE id = $1`, [id]);
  if (!rowCount) return res.status(404).json({ message: 'Receiver not found' });
  res.status(204).send();
}));

// --- RTI Templates (DB-backed; frontend template manager is unchanged)
app.get('/api/rti-templates', asyncHandler(async (req, res) => {
  const { page, pageSize, offset, limit } = normalizePagination(req.query);
  const totalItems = await countAll('rti_templates');
  const { rows } = await pool.query(
    `SELECT id, title, description, file, created_at AS "createdAt", updated_at AS "updatedAt"
     FROM rti_templates
     ORDER BY updated_at DESC
     OFFSET $1 LIMIT $2`,
    [offset, limit]
  );
  res.json({ data: rows, pagination: paginationMeta({ page, pageSize, totalItems }) });
}));

app.post('/api/rti-templates', asyncHandler(async (req, res) => {
  const { title, description, file } = req.body ?? {};
  if (!title) return res.status(422).json({ message: 'title is required' });
  if (!file) return res.status(422).json({ message: 'file is required' });
  const { rows } = await pool.query(
    `INSERT INTO rti_templates (title, description, file)
     VALUES ($1, $2, $3)
     RETURNING id, title, description, file, created_at AS "createdAt", updated_at AS "updatedAt"`,
    [title, description ?? null, file]
  );
  res.status(201).json(rows[0]);
}));

app.put('/api/rti-templates/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, description, file } = req.body ?? {};
  const { rows } = await pool.query(
    `UPDATE rti_templates
     SET
       title = COALESCE($2, title),
       description = COALESCE($3, description),
       file = COALESCE($4, file),
       updated_at = NOW()
     WHERE id = $1
     RETURNING id, title, description, file, created_at AS "createdAt", updated_at AS "updatedAt"`,
    [id, title ?? null, description ?? null, file ?? null]
  );
  if (!rows[0]) return res.status(404).json({ message: 'Template not found' });
  res.json(rows[0]);
}));

app.delete('/api/rti-templates/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { rowCount } = await pool.query(`DELETE FROM rti_templates WHERE id = $1`, [id]);
  if (!rowCount) return res.status(404).json({ message: 'Template not found' });
  res.status(204).send();
}));

// --- RTI Statuses
app.get('/api/rti-statuses', asyncHandler(async (req, res) => {
  const { page, pageSize, offset, limit } = normalizePagination(req.query);
  const totalItems = await countAll('rti_statuses');
  const { rows } = await pool.query(
    `SELECT id, name, created_at AS "createdAt", updated_at AS "updatedAt"
     FROM rti_statuses
     ORDER BY name ASC
     OFFSET $1 LIMIT $2`,
    [offset, limit]
  );
  res.json({ data: rows, pagination: paginationMeta({ page, pageSize, totalItems }) });
}));

app.post('/api/rti-statuses', asyncHandler(async (req, res) => {
  const { name } = req.body ?? {};
  if (!name) return res.status(422).json({ message: 'name is required' });
  const { rows } = await pool.query(
    `INSERT INTO rti_statuses (name) VALUES ($1)
     RETURNING id, name, created_at AS "createdAt", updated_at AS "updatedAt"`,
    [name]
  );
  res.status(201).json(rows[0]);
}));

app.put('/api/rti-statuses/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name } = req.body ?? {};
  if (!name) return res.status(422).json({ message: 'name is required' });
  const { rows } = await pool.query(
    `UPDATE rti_statuses SET name = $2, updated_at = NOW()
     WHERE id = $1
     RETURNING id, name, created_at AS "createdAt", updated_at AS "updatedAt"`,
    [id, name]
  );
  if (!rows[0]) return res.status(404).json({ message: 'Status not found' });
  res.json(rows[0]);
}));

app.delete('/api/rti-statuses/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { rowCount } = await pool.query(`DELETE FROM rti_statuses WHERE id = $1`, [id]);
  if (!rowCount) return res.status(404).json({ message: 'Status not found' });
  res.status(204).send();
}));

// --- RTI Requests (list + CRUD)
app.get('/api/rti-requests', asyncHandler(async (req, res) => {
  const { page, pageSize, offset, limit } = normalizePagination(req.query);
  const totalItems = await countAll('rti_requests');
  const { rows } = await pool.query(
    `SELECT
       rr.id,
       rr.title,
       rr.description,
       rr.sender_id AS "senderId",
       s.name AS "senderName",
       rr.receiver_id AS "receiverId",
       i.name AS "receiverInstitution",
       p.name AS "receiverPosition",
       rr.rti_template_id AS "rtiTemplateId",
       t.title AS "rtiTemplateTitle",
       rr.created_at AS "createdAt",
       rr.updated_at AS "updatedAt"
     FROM rti_requests rr
     JOIN senders s ON s.id = rr.sender_id
     JOIN receivers r ON r.id = rr.receiver_id
     JOIN institutions i ON i.id = r.institution_id
     JOIN positions p ON p.id = r.position_id
     LEFT JOIN rti_templates t ON t.id = rr.rti_template_id
     ORDER BY rr.updated_at DESC
     OFFSET $1 LIMIT $2`,
    [offset, limit]
  );
  res.json({ data: rows, pagination: paginationMeta({ page, pageSize, totalItems }) });
}));

app.post('/api/rti-requests', asyncHandler(async (req, res) => {
  const { title, description, senderId, receiverId, rtiTemplateId } = req.body ?? {};
  if (!title) return res.status(422).json({ message: 'title is required' });
  if (!senderId) return res.status(422).json({ message: 'senderId is required' });
  if (!receiverId) return res.status(422).json({ message: 'receiverId is required' });

  const { rows } = await pool.query(
    `INSERT INTO rti_requests (title, description, sender_id, receiver_id, rti_template_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, title, description, sender_id AS "senderId", receiver_id AS "receiverId", rti_template_id AS "rtiTemplateId", created_at AS "createdAt", updated_at AS "updatedAt"`,
    [title, description ?? null, senderId, receiverId, rtiTemplateId ?? null]
  );
  res.status(201).json(rows[0]);
}));

app.put('/api/rti-requests/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, description, senderId, receiverId, rtiTemplateId } = req.body ?? {};

  const { rows } = await pool.query(
    `UPDATE rti_requests
     SET
       title = COALESCE($2, title),
       description = COALESCE($3, description),
       sender_id = COALESCE($4, sender_id),
       receiver_id = COALESCE($5, receiver_id),
       rti_template_id = $6,
       updated_at = NOW()
     WHERE id = $1
     RETURNING id, title, description, sender_id AS "senderId", receiver_id AS "receiverId", rti_template_id AS "rtiTemplateId", created_at AS "createdAt", updated_at AS "updatedAt"`,
    [id, title ?? null, description ?? null, senderId ?? null, receiverId ?? null, rtiTemplateId ?? null]
  );
  if (!rows[0]) return res.status(404).json({ message: 'RTI Request not found' });
  res.json(rows[0]);
}));

app.delete('/api/rti-requests/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { rowCount } = await pool.query(`DELETE FROM rti_requests WHERE id = $1`, [id]);
  if (!rowCount) return res.status(404).json({ message: 'RTI Request not found' });
  res.status(204).send();
}));

// --- RTI Request details (view action)
app.get('/api/rti-requests/:id/details', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const requestQ = await pool.query(
    `SELECT
       rr.id,
       rr.title,
       rr.description,
       rr.sender_id AS "senderId",
       s.name AS "senderName",
       s.email AS "senderEmail",
       s.address AS "senderAddress",
       s.contact_no AS "senderContactNo",
       rr.receiver_id AS "receiverId",
       r.email AS "receiverEmail",
       r.address AS "receiverAddress",
       r.contact_no AS "receiverContactNo",
       i.id AS "institutionId",
       i.name AS "institutionName",
       p.id AS "positionId",
       p.name AS "positionName",
       rr.rti_template_id AS "rtiTemplateId",
       t.title AS "rtiTemplateTitle",
       t.description AS "rtiTemplateDescription",
       t.file AS "rtiTemplateFile",
       rr.created_at AS "createdAt",
       rr.updated_at AS "updatedAt"
     FROM rti_requests rr
     JOIN senders s ON s.id = rr.sender_id
     JOIN receivers r ON r.id = rr.receiver_id
     JOIN institutions i ON i.id = r.institution_id
     JOIN positions p ON p.id = r.position_id
     LEFT JOIN rti_templates t ON t.id = rr.rti_template_id
     WHERE rr.id = $1`,
    [id]
  );

  if (!requestQ.rows[0]) return res.status(404).json({ message: 'RTI Request not found' });

  const historiesQ = await pool.query(
    `SELECT
       h.id,
       h.rti_request_id AS "rtiRequestId",
       h.status_id AS "statusId",
       s.name AS "statusName",
       h.direction,
       h.description,
       h.entry_time AS "entryTime",
       h.exit_time AS "exitTime",
       h.file,
       h.created_at AS "createdAt",
       h.updated_at AS "updatedAt"
     FROM rti_status_histories h
     JOIN rti_statuses s ON s.id = h.status_id
     WHERE h.rti_request_id = $1
     ORDER BY h.entry_time DESC`,
    [id]
  );

  res.json({
    request: requestQ.rows[0],
    statusHistories: historiesQ.rows
  });
}));

// --- Error handler
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  // Duplicate key / unique violations
  if (err?.code === '23505') return res.status(409).json({ message: 'Conflict (unique constraint)' });
  if (err?.code === '23503') return res.status(409).json({ message: 'Conflict (foreign key constraint)' });
  if (err?.code === '23514') return res.status(422).json({ message: 'Unprocessable (check constraint)' });

  console.error(err);
  res.status(500).json({ message: 'Internal Server Error' });
});

const port = Number.parseInt(process.env.PORT ?? '8080', 10);
app.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});

