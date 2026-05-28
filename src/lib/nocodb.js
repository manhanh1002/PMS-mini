const NOCODB_API_URL = process.env.NOCODB_API_URL ? process.env.NOCODB_API_URL.replace(/\/$/, '') : '';
const NOCODB_API_TOKEN = process.env.NOCODB_API_TOKEN;
const NOCODB_BASE_ID = process.env.NOCODB_BASE_ID;

const TABLES = {
  branches: process.env.NOCODB_TABLE_BRANCHES || 'Branches',
  rooms: process.env.NOCODB_TABLE_ROOMS || 'Rooms',
  bookings: process.env.NOCODB_TABLE_BOOKINGS || 'Bookings',
  users: process.env.NOCODB_TABLE_USERS || 'Users',
  services: process.env.NOCODB_TABLE_SERVICES || 'ExtraServices',
  bookingServices: process.env.NOCODB_TABLE_BOOKING_SERVICES || 'BookingServices',
  payments: process.env.NOCODB_TABLE_PAYMENTS || 'Payments',
  bookingSources: process.env.NOCODB_TABLE_BOOKING_SOURCES || 'BookingSources',
  roomBlocks: process.env.NOCODB_TABLE_ROOM_BLOCKS || 'RoomBlocks',
  cashBook: process.env.NOCODB_TABLE_CASHBOOK || 'CashBook',
  settings: process.env.NOCODB_TABLE_SETTINGS || 'Settings',
  promotions: process.env.NOCODB_TABLE_PROMOTIONS || 'Promotions',
};

async function nocoRequest(path, options = {}) {
  const url = `${NOCODB_API_URL}/api/v1/db/data/v1/${NOCODB_BASE_ID}/${path}`;
  const response = await fetch(url, {
    cache: 'no-store',
    ...options,
    headers: {
      'xc-token': NOCODB_API_TOKEN,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`NocoDB Error: ${response.status} ${response.statusText} - ${errText}`);
  }
  return response.json();
}

export const noco = {
  // Branches
  async getBranches() {
    try {
      const res = await nocoRequest(`${TABLES.branches}`);
      return res.list || res || [];
    } catch (e) {
      console.error(e);
      return [];
    }
  },
  async createBranch(data) {
    return nocoRequest(`${TABLES.branches}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  async updateBranch(id, data) {
    return nocoRequest(`${TABLES.branches}/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  // Rooms
  async getRoom(id) {
    return nocoRequest(`${TABLES.rooms}/${id}`);
  },
  async getRooms(branchId = null) {
    try {
      let query = '';
      if (branchId && branchId !== 'all' && branchId !== 'All') {
        query = `?where=(BranchId,eq,${branchId})`;
      }
      const res = await nocoRequest(`${TABLES.rooms}${query}`);
      return res.list || res || [];
    } catch (e) {
      console.error(e);
      return [];
    }
  },
  async createRoom(data) {
    return nocoRequest(`${TABLES.rooms}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  async updateRoom(id, data) {
    return nocoRequest(`${TABLES.rooms}/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  // Bookings
  async getBookings(branchId = null) {
    try {
      let query = '';
      if (branchId && branchId !== 'all' && branchId !== 'All') {
        query = `?where=(BranchId,eq,${branchId})`;
      }
      const res = await nocoRequest(`${TABLES.bookings}${query}`);
      return res.list || res || [];
    } catch (e) {
      console.error(e);
      return [];
    }
  },
  async getBooking(id) {
    return nocoRequest(`${TABLES.bookings}/${id}`);
  },
  async createBooking(data) {
    return nocoRequest(`${TABLES.bookings}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  async updateBooking(id, data) {
    return nocoRequest(`${TABLES.bookings}/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
  // Fetch only active bookings for a specific room (excludes Cancelled & NoShow)
  async getBookingsByRoom(roomId) {
    try {
      const res = await nocoRequest(
        `${TABLES.bookings}?where=(RoomId,eq,${roomId})~and(Status,ne,Cancelled)~and(Status,ne,NoShow)&limit=500`
      );
      return res.list || res || [];
    } catch (e) {
      console.error(e);
      return [];
    }
  },

  // Users / Authentication
  async getUser(username) {
    try {
      const res = await nocoRequest(`${TABLES.users}?where=(Username,eq,${username})`);
      const list = res.list || res || [];
      if (list.length > 0) return list[0];

      // Check if the entire Users table is completely empty
      try {
        const allUsersRes = await nocoRequest(`${TABLES.users}`);
        const allUsers = allUsersRes.list || allUsersRes || [];
        if (allUsers.length === 0) {
          const defaultAdmin = {
            Username: 'admin',
            PasswordHash: '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', // sha-256 of 'admin'
            FullName: 'System Administrator',
            Role: 'Admin'
          };
          await nocoRequest(`${TABLES.users}`, {
            method: 'POST',
            body: JSON.stringify(defaultAdmin)
          });
          if (username === 'admin') {
            return defaultAdmin;
          }
        }
      } catch (err) {
        console.warn('Failed to seed default admin, Table might not exist yet:', err.message);
      }
      return null;
    } catch (e) {
      console.error('Error fetching user:', e);
      return null;
    }
  },
  async createUser(data) {
    return nocoRequest(`${TABLES.users}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Services Master
  async getExtraServices(branchId = null) {
    try {
      let query = '';
      if (branchId && branchId !== 'all' && branchId !== 'All') {
        // Services can belong to a branch, or be global (BranchId is blank or null)
        query = `?where=(BranchId,eq,${branchId})~or(BranchId,blank)`;
      }
      const res = await nocoRequest(`${TABLES.services}${query}`);
      return res.list || res || [];
    } catch (e) {
      console.error(e);
      return [];
    }
  },
  async createExtraService(data) {
    return nocoRequest(`${TABLES.services}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  async updateExtraService(id, data) {
    return nocoRequest(`${TABLES.services}/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
  async deleteExtraService(id) {
    return nocoRequest(`${TABLES.services}/${id}`, {
      method: 'DELETE',
    });
  },

  // Booking Services Ordered
  async getBookingServices(bookingId) {
    try {
      const res = await nocoRequest(`${TABLES.bookingServices}?where=(BookingId,eq,${bookingId})`);
      return res.list || res || [];
    } catch (e) {
      console.error(e);
      return [];
    }
  },
  async addServiceToBooking(data) {
    return nocoRequest(`${TABLES.bookingServices}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  async removeServiceFromBooking(id) {
    return nocoRequest(`${TABLES.bookingServices}/${id}`, {
      method: 'DELETE',
    });
  },

  // Payments
  async getPayments(bookingId) {
    try {
      const res = await nocoRequest(`${TABLES.payments}?where=(BookingId,eq,${bookingId})`);
      return res.list || res || [];
    } catch (e) {
      console.error(e);
      return [];
    }
  },
  async addPayment(data) {
    return nocoRequest(`${TABLES.payments}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  async deletePayment(id) {
    return nocoRequest(`${TABLES.payments}/${id}`, {
      method: 'DELETE',
    });
  },

  // Booking Sources
  async getBookingSources() {
    try {
      const res = await nocoRequest(`${TABLES.bookingSources}`);
      return res.list || res || [];
    } catch (e) {
      console.error(e);
      return [];
    }
  },
  async createBookingSource(data) {
    return nocoRequest(`${TABLES.bookingSources}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  async updateBookingSource(id, data) {
    return nocoRequest(`${TABLES.bookingSources}/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
  async deleteBookingSource(id) {
    return nocoRequest(`${TABLES.bookingSources}/${id}`, {
      method: 'DELETE',
    });
  },

  // Promotions
  async getPromotions() {
    try {
      const res = await nocoRequest(`${TABLES.promotions}?limit=200`);
      return res.list || res || [];
    } catch (e) {
      console.error('Error fetching promotions:', e);
      return [];
    }
  },
  async getPromotionByCode(code) {
    try {
      const res = await nocoRequest(`${TABLES.promotions}?where=(Code,eq,${code})`);
      const list = res.list || res || [];
      return list.length > 0 ? list[0] : null;
    } catch (e) {
      console.error('Error fetching promotion by code:', e);
      return null;
    }
  },
  async createPromotion(data) {
    return nocoRequest(`${TABLES.promotions}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  async updatePromotion(id, data) {
    return nocoRequest(`${TABLES.promotions}/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
  async deletePromotion(id) {
    return nocoRequest(`${TABLES.promotions}/${id}`, {
      method: 'DELETE',
    });
  },

  // Room Blocks
  async getRoomBlocks() {
    try {
      const res = await nocoRequest(`${TABLES.roomBlocks}`);
      return res.list || res || [];
    } catch (e) {
      console.error(e);
      return [];
    }
  },
  // Fetch room blocks for a specific room only
  async getRoomBlocksByRoom(roomId) {
    try {
      const res = await nocoRequest(`${TABLES.roomBlocks}?where=(RoomId,eq,${roomId})&limit=200`);
      return res.list || res || [];
    } catch (e) {
      console.error(e);
      return [];
    }
  },
  async createRoomBlock(data) {
    return nocoRequest(`${TABLES.roomBlocks}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  async deleteRoomBlock(id) {
    return nocoRequest(`${TABLES.roomBlocks}/${id}`, {
      method: 'DELETE',
    });
  },

  // Cash Book
  async getCashBook(branchId = null) {
    try {
      let query = '';
      if (branchId && branchId !== 'all' && branchId !== 'All') {
        query = `?where=(BranchId,eq,${branchId})`;
      }
      const res = await nocoRequest(`${TABLES.cashBook}${query}`);
      return res.list || res || [];
    } catch (e) {
      console.error(e);
      return [];
    }
  },
  async createCashBookEntry(data) {
    return nocoRequest(`${TABLES.cashBook}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  async deleteCashBookEntry(id) {
    return nocoRequest(`${TABLES.cashBook}/${id}`, {
      method: 'DELETE',
    });
  },

  // Settings
  async getSettings() {
    try {
      const res = await nocoRequest(`${TABLES.settings}?limit=100`);
      const list = res.list || res || [];
      // Convert to flat key-value object for easy access
      const settings = {};
      for (const row of list) {
        if (row.SettingKey) {
          settings[row.SettingKey] = row.SettingValue || '';
        }
      }
      return settings;
    } catch (e) {
      console.error('Error fetching settings:', e);
      return {};
    }
  },
  async getSettingsRaw() {
    try {
      const res = await nocoRequest(`${TABLES.settings}?limit=100`);
      return res.list || res || [];
    } catch (e) {
      console.error('Error fetching settings raw:', e);
      return [];
    }
  },
  async upsertSetting(key, value) {
    // Find if key exists, update or insert
    try {
      const res = await nocoRequest(`${TABLES.settings}?where=(SettingKey,eq,${encodeURIComponent(key)})`);
      const list = res.list || res || [];
      if (list.length > 0) {
        return nocoRequest(`${TABLES.settings}/${list[0].Id}`, {
          method: 'PATCH',
          body: JSON.stringify({ SettingValue: value }),
        });
      } else {
        return nocoRequest(`${TABLES.settings}`, {
          method: 'POST',
          body: JSON.stringify({ SettingKey: key, SettingValue: value }),
        });
      }
    } catch (e) {
      console.error(`Error upserting setting ${key}:`, e);
      throw e;
    }
  },

  // Users / Member Management
  async getUsers() {
    try {
      const res = await nocoRequest(`${TABLES.users}?limit=200`);
      const list = res.list || res || [];
      // Strip password hashes for safety
      return list.map(({ PasswordHash, ...u }) => u);
    } catch (e) {
      console.error('Error fetching users:', e);
      return [];
    }
  },
  async createUser(data) {
    return nocoRequest(`${TABLES.users}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  async updateUser(id, data) {
    return nocoRequest(`${TABLES.users}/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
  async deleteUser(id) {
    return nocoRequest(`${TABLES.users}/${id}`, {
      method: 'DELETE',
    });
  },
};
