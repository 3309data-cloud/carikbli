export const getKbliHierarchy = (kode) => {
  if (!kode) return { catLet: "-", catName: "-", groupName: "-" };

  const prefix = kode.substring(0, 2);
  const groupNum = parseInt(prefix);

  let category = { let: "?", name: "Lainnya" };
  let groupName = "Golongan Pokok " + prefix;

  // PEMETAAN KATEGORI (A-V)
  if (groupNum >= 1 && groupNum <= 3) {
    category = { let: "A", name: "Pertanian, Kehutanan, dan Perikanan" };
    if (groupNum === 1) groupName = "Pertanian Tanaman, Peternakan, Perburuan dan Jasa Terkait";
    if (groupNum === 2) groupName = "Pengelolaan Kehuatanan dan Pemanenan Kayu";
    if (groupNum === 3) groupName = "Perikanan";
  }
  else if (groupNum >= 5 && groupNum <= 9) {
    category = { let: "B", name: "Pertambangan dan Penggalian" };
    if (groupNum === 5) groupName = "Pertambangan Batu Bara dan Lignit";
    if (groupNum === 6) groupName = "Pertambangan Minyak Bumi Mentah dan Gas Alam";
    if (groupNum === 7) groupName = "Pertambangan Bijih Logam";
    if (groupNum === 8) groupName = "Pertambangan dan Penggalian Lainnya";
    if (groupNum === 9) groupName = "Aktifitas Jasa Penunjang Pertambangan";
  }
  else if (groupNum >= 10 && groupNum <= 33) {
    category = { let: "C", name: "Industri" };
    if (groupNum === 10) groupName = "Industri Makanan";
    if (groupNum === 11) groupName = "Industri Minuman";
    if (groupNum === 12) groupName = "Industri Produk Tembakau";
    if (groupNum === 13) groupName = "Industri Tekstil";
    if (groupNum === 14) groupName = "Industri Pakaian Jadi dan Perlengkapannya (Apparel)";
    if (groupNum === 15) groupName = "Industri Kulit dan Produk Sejenisnya";
    if (groupNum === 16) groupName = "Industri MakananIndustri Kayu, BArang Dari Kayu dan Gabus(Tidak Termasuk Furnitur); Barang Anyaman Dari Bambu, Rotan, dan Sejenisnya";
    if (groupNum === 17) groupName = "Industri Kertas dan Barang Dari Kertas";
    if (groupNum === 18) groupName = "Percetakan dan Reproduksi Media Rekaman";
    if (groupNum === 19) groupName = "Industri Produk dari Batu Bara dan Pengilangan Minyak Bumi";
    if (groupNum === 20) groupName = "Industri Bahan Kimia dan Barang dari Barang Kimia";
    if (groupNum === 21) groupName = "Industri Industri Sediaan Farmasi, Obat Kimia dan Obat Tradisional";
    if (groupNum === 22) groupName = "Industri Industri Barang Dari Karet dan Plastik";
    if (groupNum === 23) groupName = "Industri Produk Mineral Nonlogam";
    if (groupNum === 24) groupName = "Industri Logam Dasar";
    if (groupNum === 25) groupName = "Industri Produk Logam Pabrikasi Bukan Mesin dan Peralatannya";
    if (groupNum === 26) groupName = "Industri Produk Komputer, Elektronik, dan Optik";
    if (groupNum === 27) groupName = "Industri Peralatan Listrik";
    if (groupNum === 28) groupName = "Industri Mesin dan Perlengkapan YTDL";
    if (groupNum === 29) groupName = "Industri Kendaraan Bermotor, Trailer, dan Semi Trailer";
    if (groupNum === 30) groupName = "Industri Industri Alat Angkutan Lainnya";
    if (groupNum === 31) groupName = "Industri Furnitur";
    if (groupNum === 32) groupName = "Industri Produk Lainnya";
    if (groupNum === 33) groupName = "Reparasi, Pemeliharaan dan Pemasangan Mesin dan Peralatan";
  }
  else if (groupNum === 35) {
    category = { let: "D", name: "Penyedia Listrik, Gas, Uap/Air Panas dan Udara Dingin" };
    if (groupNum === 35) groupName = "Penyedia Listrik, Gas, Uap/Air Panas dan Udara Dingin";
  }
  else if (groupNum >= 36 && groupNum <= 39) {
    category = { let: "E", name: "Penyedia Air; Pengelolaan Air Limbah, Penanganan Limbah, Dan Remediasi" };
    if (groupNum === 36) groupName = "Penampungan, Pengambilan, Pengolahan dan Penyediaan Air";
    if (groupNum === 37) groupName = "Pengelolaan Air Limbah";
    if (groupNum === 38) groupName = "Pengumpulan, Pengolahan dan Pembuangan Limbah atau Sampah; serta Aktivitas Pemulihan";
    if (groupNum === 39) groupName = "Aktivitas Remediasi dan Pengelolaan Limbah atau Sampah Lainnya";
  }

  else if (groupNum >= 41 && groupNum <= 43) {
    category = { let: "F", name: "Konstruksi" };
    if (groupNum === 41) groupName = "Kontruksi Gedung Hunian dan Gedung Non Hunian";
    if (groupNum === 42) groupName = "Kontruksi Bangunan Sipil";
    if (groupNum === 43) groupName = "KOnstruksi Khusus";
  }

  else if (groupNum >= 46 && groupNum <= 47) {
    category = { let: "G", name: "Perdagangan Besar dan Eceran" };
    if (groupNum === 46) groupName = "Perdagangan Besar";
    if (groupNum === 47) groupName = "Perdagangan Eceran";
  }

  else if (groupNum >= 49 && groupNum <= 53) {
    category = { let: "H", name: "Transportasi dan Penyimpanan" };
    if (groupNum === 49) groupName = "Transportasi Jalan, Transportasi Kereta Api, dan Transportasi melalui Saluran Pipa";
    if (groupNum === 50) groupName = "Transportasi Perairan";
    if (groupNum === 51) groupName = "Transportasi Udara";
    if (groupNum === 52) groupName = "Pergudangan dan Aktivitas Penunjang Angkutan";
    if (groupNum === 53) groupName = "Aktivitas Pos dan Kurir";
  }

  else if (groupNum >= 55 && groupNum <= 56) {
    category = { let: "I", name: "Aktivitas Penyediaan Akomodasi dan Makan Minum" };
    if (groupNum === 55) groupName = "Penyedia Akomodasi";
    if (groupNum === 56) groupName = "Penyedia Makan Minum";
  }


  else if (groupNum >= 58 && groupNum <= 60) {category = { let: "J", name: "Aktivitas Penerbitan, Penyiaran, serta Produksi dan Distribusi Konten" };
  if (groupNum === 58) groupName = "Aktivitas Penerbitan";
  if (groupNum === 59) groupName = "Aktivitas Produksi Film, Video, dan Program Televisi, serta Perekaman Suara dan Penerbitan Musik";
  if (groupNum === 60) groupName = "Aktivitas Pemrograman, Penyiaran, Kantor Berita, dan Distribusi Konten Lainnya";
}

  
  else if (groupNum >= 61 && groupNum <= 63) {category = { let: "K", name: "Aktivitas Telekomunikasi, Pemrograman Komputer, Konsultansi, Infrastruktur Komputasi, dan Jasa Informasi Lainnya" };
if (groupNum === 61) groupName = "Telekomunikasi";
if (groupNum === 62) groupName = "Aktivitas Pemrograman, Konsultansi Komputer, dan Aktivitas Terkait";
if (groupNum === 63) groupName = "Aktivitas Jasa Infrastruktur Komputasi, Pengolahan Data, Hosting, dan Informasi Lainnya";
  }

  
  else if (groupNum >= 64 && groupNum <= 66) {category = { let: "L", name: "Aktivitas Keuangan dan Asuransi" };
if (groupNum === 64) groupName = "Aktivitas Jasa Keuangan, Kecuali Asuransi Dan Dana Pensiun";
if (groupNum === 65) groupName = "Asuransi, Penjaminan, Reasuransi, dan Dana Pensiun, Kecuali Jaminan Sosial Wajib";
if (groupNum === 66) groupName = "Aktivitas Penunjang Jasa Keuangan, Asuransi, Penjaminan dan Dana Pensiun";
  }

  
  else if (groupNum === 68) {category = { let: "M", name: "Aktivitas Real Estat" };
if (groupNum === 68) groupName = "Aktivitas Real Estat";
  }

  
  else if (groupNum >= 69 && groupNum <= 75) {category = { let: "N", name: "Aktivitas Profesional, Ilmiah, dan Teknis" };
if (groupNum === 69) groupName = "Aktivitas Hukum dan Akuntansi";
if (groupNum === 70) groupName = "Aktivitas Kantor Pusat dan Konsultansi Manajemen";
if (groupNum === 71) groupName = "Aktivitas Arsitektural dan Enjinering; Pengujian dan Analisis Teknis";
if (groupNum === 72) groupName = "Penelitian dan Pengembangan Ilmiah";
if (groupNum === 73) groupName = "Aktivitas Periklanan, Penelitian Pasar, dan Kehumasan";
if (groupNum === 74) groupName = "Aktivitas Profesional, Ilmiah, dan Teknis lainnya";
if (groupNum === 75) groupName = "Aktivitas Kesehatan Hewan (Veteriner)";
  }

  
  else if (groupNum >= 77 && groupNum <= 82) {category = { let: "O", name: "Aktivitas Administratif dan Penunjang Usaha" };
if (groupNum === 77) groupName = "Penyewaan dan Sewa Guna Usaha";
if (groupNum === 78) groupName = "Aktivitas Ketenagakerjaan";
if (groupNum === 79) groupName = "Aktivitas Agen Perjalanan, Penyelenggara Tur, dan Jasa Terkait";
if (groupNum === 80) groupName = "Aktivitas Investigasi dan Keamanan";
if (groupNum === 81) groupName = "Aktivitas Jasa untuk Bangunan dan Lanskap";
if (groupNum === 82) groupName = "Aktivitas Administratif, Aktivitas Penunjang Kantor dan Aktivitas Penunjang Usaha";
  }

  
  else if (groupNum === 84) {category = { let: "P", name: "Administrasi Pemerintahan dan Pertahanan, Serta Jaminan Sosial Wajib" };
if (groupNum === 84) groupName = "Administrasi Pemerintahan dan Pertahanan; Jaminan Sosial Wajib";
  }

  
  else if (groupNum === 85) {category = { let: "Q", name: "Pendidikan" };
if (groupNum === 85) groupName = "Pendidikan";
  }

  
  else if (groupNum >= 86 && groupNum <= 88) {category = { let: "R", name: "Aktivitas Kesehatan Manusia dan Aktivitas Sosial" };
if (groupNum === 86) groupName = "Aktivitas Kesehatan Manusia";
if (groupNum === 87) groupName = "Aktivitas Perawatan Berbasis Residensial";
if (groupNum === 88) groupName = "Aktivitas Sosial Tanpa Akomodasi";
  }

  
  else if (groupNum >= 90 && groupNum <= 93) {category = { let: "S", name: "Kesenian, Olahraga, dan Rekreasi" };
if (groupNum === 90) groupName = "Aktivitas Penciptaan Karya Seni dan Seni Pertunjukan";
if (groupNum === 91) groupName = "Perpustakaan, Arsip, Museum, dan Kegiatan Kebudayaan Lainnya";
if (groupNum === 92) groupName = "Aktivitas Perjudian dan Pertaruhan";
if (groupNum === 93) groupName = "Aktivitas Olahraga, Hiburan, dan Rekreasi";
  }

  
  else if (groupNum >= 94 && groupNum <= 96) {category = { let: "T", name: "Aktivitas Jasa Lainnya" };
if (groupNum === 94) groupName = "Aktivitas Keanggotaan Organisasi";
if (groupNum === 95) groupName = "Reparasi dan Pemeliharaan Komputer, Barang Keperluan Pribadi dan Perlengkapan Rumah Tangga, serta Kendaraan Bermotor dan Sepeda Motor";
if (groupNum === 96) groupName = "Aktivitas Jasa Perorangan";
  }

  
  else if (groupNum >= 97 && groupNum <= 98) {category = { let: "U", name: "Aktivitas Rumah Tangga sebagai Pemberi Kerja dan Aktivitas Produksi Barang dan Jasa oleh Rumah Tangga untuk Keperluan Sendiri yang Tidak Terdiferensiasi" };
if (groupNum === 97) groupName = "Aktivitas Rumah Tangga sebagai Pemberi Kerja bagi Pekerja Rumah Tangga (PRT)";
if (groupNum === 98) groupName = "Aktivitas Produksi Beragam Barang dan Jasa oleh Rumah Tangga untuk Keperluan Sendiri";
  }

    else if (groupNum === 99) {category = { let: "V", name: "Aktivitas Badan Internasional dan Badan Ekstra Internasional Lainnya" };
if (groupNum === 99) groupName = "Aktivitas Badan Internasional dan Badan Ekstra Internasional Lainnya";
  }

return { catLet: category.let, catName: category.name, group: prefix, groupName };
};