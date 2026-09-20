import type { Presentation } from "./types";

/**
 * Canonical IG-01 sample: what a dense source infographic looks like once it
 * has been rebuilt as native slides. Three metric cards, then six plain cards.
 */
export const sampleIg01Presentation: Presentation = {
  dslVersion: "1.0.0",
  id: "ig01-program-gizi",
  title: "Program gizi sekolah",
  styleId: "strategyConsulting",
  audience: "Dinas pendidikan dan tim program",
  objective: "Ringkas infografis program menjadi deck yang bisa dipresentasikan",
  slides: [
    {
      id: "slide-ig01-dampak",
      archetype: "IG-01",
      actionTitle:
        "Tiga bulan pertama program menaikkan kehadiran dan menurunkan angka anemia",
      keyMessage: "Intervensi gizi harian memberi hasil terukur pada kuartal pertama.",
      content: {
        kicker: "Dampak kuartal pertama",
        cards: [
          {
            heading: "Kehadiran siswa naik",
            body: "Rata-rata kehadiran harian di 42 sekolah percontohan naik dibanding periode sebelum program.",
            metric: "+18%",
            iconHint: "sekolah",
          },
          {
            heading: "Angka anemia turun",
            body: "Skrining ulang pada 3.100 siswa menunjukkan penurunan prevalensi anemia ringan.",
            metric: "-11%",
            iconHint: "kesehatan",
          },
          {
            heading: "Menu terstandar",
            body: "Seluruh dapur mitra memakai satu daftar menu dengan takaran gizi yang sama.",
            metric: "42",
            iconHint: "menu gizi",
          },
        ],
        takeaway:
          "Perluasan ke 120 sekolah layak dijalankan pada kuartal berikutnya.",
      },
      visual: { type: "card-grid", emphasis: "metric" },
      sources: ["Laporan monitoring program, Agustus 2026"],
    },
    {
      id: "slide-ig01-pilar",
      archetype: "IG-01",
      actionTitle: "Enam pilar operasional menopang pelaksanaan harian program",
      keyMessage: "Setiap pilar punya penanggung jawab dan ukuran keberhasilan sendiri.",
      content: {
        cards: [
          {
            heading: "Pengadaan bahan",
            body: "Kontrak pemasok lokal dengan jadwal kirim harian.",
            iconHint: "menu",
          },
          {
            heading: "Dapur mitra",
            body: "Sertifikasi kebersihan dan audit berkala tiap kuartal.",
            iconHint: "standar",
          },
          {
            heading: "Distribusi",
            body: "Rute antar sekolah dengan jendela waktu dua jam.",
            iconHint: "integrasi",
          },
          {
            heading: "Pemantauan gizi",
            body: "Skrining berkala oleh petugas puskesmas pendamping.",
            iconHint: "monitoring",
          },
          {
            heading: "Pelaporan",
            body: "Satu dasbor harian yang dibaca dinas dan sekolah.",
            iconHint: "visibilitas",
          },
          {
            heading: "Keterlibatan orang tua",
            body: "Sesi edukasi bulanan di tiap sekolah peserta.",
            iconHint: "orang tua",
          },
        ],
      },
      visual: { type: "card-grid", emphasis: "narrative" },
    },
  ],
};
