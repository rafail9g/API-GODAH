function firstDefined(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== "");
}

function toNumber(value) {
  if (value === undefined || value === null || value === "") return undefined;
  const number = Number(value);
  return Number.isNaN(number) ? undefined : number;
}

function stripUndefined(payload) {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined)
  );
}

function normalizePorterVerificationStatus(value) {
  const status = firstDefined(value);
  if (!status || typeof status !== "string") return status;

  const normalized = status.trim().toLowerCase();
  const aliases = {
    approved: "disetujui",
    accepted: "disetujui",
    verified: "disetujui",
    diterima: "disetujui",
    reject: "ditolak",
    rejected: "ditolak",
    pending: "menunggu",
    waiting: "menunggu",
  };

  return aliases[normalized] || normalized;
}

const USER_STATUSES = ["aktif", "nonaktif", "diblokir"];
const PORTER_STATUSES = ["aktif", "nonaktif", "diblokir"];
const PORTER_VERIFICATION_STATUSES = ["menunggu", "disetujui", "ditolak"];
const ORDER_STATUSES = [
  "menunggu",
  "diterima",
  "menuju_lokasi",
  "dalam_perjalanan",
  "sampai_tujuan",
  "selesai",
  "batal",
];

function isAllowed(value, allowedValues) {
  return allowedValues.includes(value);
}

function mapUserPayload(body = {}) {
  return stripUndefined({
    nama: firstDefined(body.nama, body.name, body.fullName, body.full_name),
    email: firstDefined(body.email),
    password_hash: firstDefined(body.password_hash, body.password, body.passwordHash),
    no_hp: firstDefined(body.no_hp, body.phone, body.phoneNumber, body.noHp),
    alamat: firstDefined(body.alamat, body.address),
    status: firstDefined(body.status),
  });
}

function mapPorterPayload(body = {}) {
  const statusVerifikasi = normalizePorterVerificationStatus(
    firstDefined(body.status_verifikasi, body.verificationStatus)
  );

  return stripUndefined({
    nama: firstDefined(body.nama, body.name, body.fullName, body.full_name),
    email: firstDefined(body.email),
    password_hash: firstDefined(body.password_hash, body.password, body.passwordHash),
    no_hp: firstDefined(body.no_hp, body.phone, body.phoneNumber, body.noHp),
    status: firstDefined(body.status),
    status_verifikasi: statusVerifikasi,
    is_aktif: firstDefined(body.is_aktif, body.isAktif, body.isActive, body.is_online, body.online, body.active),
    latitude: toNumber(firstDefined(body.latitude, body.lat, body.lat_saat_ini, body.currentLat)),
    longitude: toNumber(firstDefined(body.longitude, body.lng, body.lon, body.lng_saat_ini, body.currentLng)),
    total_selesai: toNumber(firstDefined(body.total_selesai, body.totalCompleted)),
  });
}

function mapOrderPayload(body = {}) {
  return stripUndefined({
    user_id: firstDefined(body.user_id, body.userId),
    porter_id: firstDefined(body.porter_id, body.porterId),
    tarif_id: firstDefined(body.tarif_id, body.tarifId),
    lokasi_jemput: firstDefined(
      body.lokasi_jemput,
      body.pickupAddress,
      body.pickup_address,
      body.pickupLocation
    ),
    lokasi_tujuan: firstDefined(
      body.lokasi_tujuan,
      body.dropoffAddress,
      body.dropoff_address,
      body.destinationAddress,
      body.destination
    ),
    lat_jemput: toNumber(firstDefined(body.lat_jemput, body.pickupLat, body.pickup_lat)),
    lng_jemput: toNumber(firstDefined(body.lng_jemput, body.pickupLng, body.pickup_lng)),
    lat_tujuan: toNumber(firstDefined(body.lat_tujuan, body.dropoffLat, body.dropoff_lat)),
    lng_tujuan: toNumber(firstDefined(body.lng_tujuan, body.dropoffLng, body.dropoff_lng)),
    jenis_barang: firstDefined(body.jenis_barang, body.itemType, body.item_type, body.goodsType),
    estimasi_berat: toNumber(firstDefined(body.estimasi_berat, body.weight, body.estimatedWeight)),
    jenis_layanan: firstDefined(body.jenis_layanan, body.serviceType, body.service_type),
    status: firstDefined(body.status),
    total_biaya: toNumber(firstDefined(body.total_biaya, body.totalPrice, body.total_price, body.price)),
    catatan: firstDefined(body.catatan, body.notes, body.note),
  });
}

function success(res, message, data, statusCode = 200, extra = {}) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    ...extra,
  });
}

function failure(res, statusCode, message, error = null) {
  return res.status(statusCode).json({
    success: false,
    message,
    ...(error ? { error } : {}),
  });
}

module.exports = {
  ORDER_STATUSES,
  PORTER_STATUSES,
  PORTER_VERIFICATION_STATUSES,
  USER_STATUSES,
  failure,
  firstDefined,
  isAllowed,
  mapOrderPayload,
  mapPorterPayload,
  mapUserPayload,
  normalizePorterVerificationStatus,
  success,
  toNumber,
};
