// Bangladesh Zila (district) -> Upazila (sub-district) data, sourced from
// nuhil/bangladesh-geocode (MIT). Used by the delivery-location picker in
// Settings/checkout — Zila and Upazila are select dropdowns; only the final
// "house/road/area" line is free text (see docs/PROGRESS.md).
export interface ZilaEntry {
  zila: string;
  upazilas: string[];
}

export const BANGLADESH_ZILAS: ZilaEntry[] = [
  {
    "zila": "Bagerhat",
    "upazilas": [
      "Bagerhat Sadar",
      "Chitalmari",
      "Fakirhat",
      "Kachua",
      "Mollahat",
      "Mongla",
      "Morrelganj",
      "Rampal",
      "Sarankhola"
    ]
  },
  {
    "zila": "Bandarban",
    "upazilas": [
      "Alikadam",
      "Bandarban Sadar",
      "Lama",
      "Naikhongchhari",
      "Rowangchhari",
      "Ruma",
      "Thanchi"
    ]
  },
  {
    "zila": "Barguna",
    "upazilas": [
      "Amtali",
      "Bamna",
      "Barguna Sadar",
      "Betagi",
      "Pathorghata",
      "Taltali"
    ]
  },
  {
    "zila": "Barisal",
    "upazilas": [
      "Agailjhara",
      "Babuganj",
      "Bakerganj",
      "Banaripara",
      "Barisal Sadar",
      "Gournadi",
      "Hizla",
      "Mehendiganj",
      "Muladi",
      "Wazirpur"
    ]
  },
  {
    "zila": "Bhola",
    "upazilas": [
      "Bhola Sadar",
      "Borhan Sddin",
      "Charfesson",
      "Doulatkhan",
      "Lalmohan",
      "Monpura",
      "Tazumuddin"
    ]
  },
  {
    "zila": "Bogura",
    "upazilas": [
      "Adamdighi",
      "Bogra Sadar",
      "Dhunot",
      "Dupchanchia",
      "Gabtali",
      "Kahaloo",
      "Nondigram",
      "Shajahanpur",
      "Shariakandi",
      "Sherpur",
      "Shibganj",
      "Sonatala"
    ]
  },
  {
    "zila": "Brahmanbaria",
    "upazilas": [
      "Akhaura",
      "Ashuganj",
      "Bancharampur",
      "Bijoynagar",
      "Brahmanbaria Sadar",
      "Kasba",
      "Nabinagar",
      "Nasirnagar",
      "Sarail"
    ]
  },
  {
    "zila": "Chandpur",
    "upazilas": [
      "Chandpur Sadar",
      "Faridgonj",
      "Haimchar",
      "Hajiganj",
      "Kachua",
      "Matlab North",
      "Matlab South",
      "Shahrasti"
    ]
  },
  {
    "zila": "Chapainawabganj",
    "upazilas": [
      "Bholahat",
      "Chapainawabganj Sadar",
      "Gomostapur",
      "Nachol",
      "Shibganj"
    ]
  },
  {
    "zila": "Chattogram",
    "upazilas": [
      "Anwara",
      "Banshkhali",
      "Boalkhali",
      "Chandanaish",
      "Fatikchhari",
      "Hathazari",
      "Karnafuli",
      "Lohagara",
      "Mirsharai",
      "Patiya",
      "Rangunia",
      "Raozan",
      "Sandwip",
      "Satkania",
      "Sitakunda"
    ]
  },
  {
    "zila": "Chuadanga",
    "upazilas": [
      "Alamdanga",
      "Chuadanga Sadar",
      "Damurhuda",
      "Jibannagar"
    ]
  },
  {
    "zila": "Comilla",
    "upazilas": [
      "Barura",
      "Brahmanpara",
      "Burichang",
      "Chandina",
      "Chauddagram",
      "Comilla Sadar",
      "Daudkandi",
      "Debidwar",
      "Homna",
      "Laksam",
      "Lalmai",
      "Meghna",
      "Monohargonj",
      "Muradnagar",
      "Nangalkot",
      "Sadarsouth",
      "Titas"
    ]
  },
  {
    "zila": "Coxsbazar",
    "upazilas": [
      "Chakaria",
      "Coxsbazar Sadar",
      "Eidgaon",
      "Kutubdia",
      "Moheshkhali",
      "Pekua",
      "Ramu",
      "Teknaf",
      "Ukhiya"
    ]
  },
  {
    "zila": "Dhaka",
    "upazilas": [
      "Dhamrai",
      "Dohar",
      "Keraniganj",
      "Nawabganj",
      "Savar"
    ]
  },
  {
    "zila": "Dinajpur",
    "upazilas": [
      "Birampur",
      "Birganj",
      "Birol",
      "Bochaganj",
      "Chirirbandar",
      "Dinajpur Sadar",
      "Fulbari",
      "Ghoraghat",
      "Hakimpur",
      "Kaharol",
      "Khansama",
      "Nawabganj",
      "Parbatipur"
    ]
  },
  {
    "zila": "Faridpur",
    "upazilas": [
      "Alfadanga",
      "Bhanga",
      "Boalmari",
      "Charbhadrasan",
      "Faridpur Sadar",
      "Madhukhali",
      "Nagarkanda",
      "Sadarpur",
      "Saltha"
    ]
  },
  {
    "zila": "Feni",
    "upazilas": [
      "Chhagalnaiya",
      "Daganbhuiyan",
      "Feni Sadar",
      "Fulgazi",
      "Parshuram",
      "Sonagazi"
    ]
  },
  {
    "zila": "Gaibandha",
    "upazilas": [
      "Gaibandha Sadar",
      "Gobindaganj",
      "Palashbari",
      "Phulchari",
      "Sadullapur",
      "Saghata",
      "Sundarganj"
    ]
  },
  {
    "zila": "Gazipur",
    "upazilas": [
      "Gazipur Sadar",
      "Kaliakair",
      "Kaliganj",
      "Kapasia",
      "Sreepur"
    ]
  },
  {
    "zila": "Gopalganj",
    "upazilas": [
      "Gopalganj Sadar",
      "Kashiani",
      "Kotalipara",
      "Muksudpur",
      "Tungipara"
    ]
  },
  {
    "zila": "Habiganj",
    "upazilas": [
      "Ajmiriganj",
      "Bahubal",
      "Baniachong",
      "Chunarughat",
      "Habiganj Sadar",
      "Lakhai",
      "Madhabpur",
      "Nabiganj"
    ]
  },
  {
    "zila": "Jamalpur",
    "upazilas": [
      "Bokshiganj",
      "Dewangonj",
      "Islampur",
      "Jamalpur Sadar",
      "Madarganj",
      "Melandah",
      "Sarishabari"
    ]
  },
  {
    "zila": "Jashore",
    "upazilas": [
      "Abhaynagar",
      "Bagherpara",
      "Chougachha",
      "Jessore Sadar",
      "Jhikargacha",
      "Keshabpur",
      "Manirampur",
      "Sharsha"
    ]
  },
  {
    "zila": "Jhalakathi",
    "upazilas": [
      "Jhalakathi Sadar",
      "Kathalia",
      "Nalchity",
      "Rajapur"
    ]
  },
  {
    "zila": "Jhenaidah",
    "upazilas": [
      "Harinakundu",
      "Jhenaidah Sadar",
      "Kaliganj",
      "Kotchandpur",
      "Moheshpur",
      "Shailkupa"
    ]
  },
  {
    "zila": "Joypurhat",
    "upazilas": [
      "Akkelpur",
      "Joypurhat Sadar",
      "Kalai",
      "Khetlal",
      "Panchbibi"
    ]
  },
  {
    "zila": "Khagrachhari",
    "upazilas": [
      "Dighinala",
      "Guimara",
      "Khagrachhari Sadar",
      "Laxmichhari",
      "Manikchari",
      "Matiranga",
      "Mohalchari",
      "Panchari",
      "Ramgarh"
    ]
  },
  {
    "zila": "Khulna",
    "upazilas": [
      "Botiaghata",
      "Dakop",
      "Digholia",
      "Dumuria",
      "Fultola",
      "Koyra",
      "Paikgasa",
      "Rupsha",
      "Terokhada"
    ]
  },
  {
    "zila": "Kishoreganj",
    "upazilas": [
      "Austagram",
      "Bajitpur",
      "Bhairab",
      "Hossainpur",
      "Itna",
      "Karimgonj",
      "Katiadi",
      "Kishoreganj Sadar",
      "Kuliarchar",
      "Mithamoin",
      "Nikli",
      "Pakundia",
      "Tarail"
    ]
  },
  {
    "zila": "Kurigram",
    "upazilas": [
      "Bhurungamari",
      "Charrajibpur",
      "Chilmari",
      "Kurigram Sadar",
      "Nageshwari",
      "Phulbari",
      "Rajarhat",
      "Rowmari",
      "Ulipur"
    ]
  },
  {
    "zila": "Kushtia",
    "upazilas": [
      "Bheramara",
      "Daulatpur",
      "Khoksa",
      "Kumarkhali",
      "Kushtia Sadar",
      "Mirpur"
    ]
  },
  {
    "zila": "Lakshmipur",
    "upazilas": [
      "Kamalnagar",
      "Lakshmipur Sadar",
      "Raipur",
      "Ramganj",
      "Ramgati"
    ]
  },
  {
    "zila": "Lalmonirhat",
    "upazilas": [
      "Aditmari",
      "Hatibandha",
      "Kaliganj",
      "Lalmonirhat Sadar",
      "Patgram"
    ]
  },
  {
    "zila": "Madaripur",
    "upazilas": [
      "Dasar",
      "Kalkini",
      "Madaripur Sadar",
      "Rajoir",
      "Shibchar"
    ]
  },
  {
    "zila": "Magura",
    "upazilas": [
      "Magura Sadar",
      "Mohammadpur",
      "Shalikha",
      "Sreepur"
    ]
  },
  {
    "zila": "Manikganj",
    "upazilas": [
      "Doulatpur",
      "Gior",
      "Harirampur",
      "Manikganj Sadar",
      "Saturia",
      "Shibaloy",
      "Singiar"
    ]
  },
  {
    "zila": "Meherpur",
    "upazilas": [
      "Gangni",
      "Meherpur Sadar",
      "Mujibnagar"
    ]
  },
  {
    "zila": "Moulvibazar",
    "upazilas": [
      "Barlekha",
      "Juri",
      "Kamolganj",
      "Kulaura",
      "Moulvibazar Sadar",
      "Rajnagar",
      "Sreemangal"
    ]
  },
  {
    "zila": "Munshiganj",
    "upazilas": [
      "Gajaria",
      "Louhajanj",
      "Munshiganj Sadar",
      "Sirajdikhan",
      "Sreenagar",
      "Tongibari"
    ]
  },
  {
    "zila": "Mymensingh",
    "upazilas": [
      "Bhaluka",
      "Dhobaura",
      "Fulbaria",
      "Gafargaon",
      "Gouripur",
      "Haluaghat",
      "Iswarganj",
      "Muktagacha",
      "Mymensingh Sadar",
      "Nandail",
      "Phulpur",
      "Tarakanda",
      "Trishal"
    ]
  },
  {
    "zila": "Naogaon",
    "upazilas": [
      "Atrai",
      "Badalgachi",
      "Dhamoirhat",
      "Manda",
      "Mohadevpur",
      "Naogaon Sadar",
      "Niamatpur",
      "Patnitala",
      "Porsha",
      "Raninagar",
      "Sapahar"
    ]
  },
  {
    "zila": "Narail",
    "upazilas": [
      "Kalia",
      "Lohagara",
      "Narail Sadar"
    ]
  },
  {
    "zila": "Narayanganj",
    "upazilas": [
      "Araihazar",
      "Bandar",
      "Narayanganj Sadar",
      "Rupganj",
      "Sonargaon"
    ]
  },
  {
    "zila": "Narsingdi",
    "upazilas": [
      "Belabo",
      "Monohardi",
      "Narsingdi Sadar",
      "Palash",
      "Raipura",
      "Shibpur"
    ]
  },
  {
    "zila": "Natore",
    "upazilas": [
      "Bagatipara",
      "Baraigram",
      "Gurudaspur",
      "Lalpur",
      "Naldanga",
      "Natore Sadar",
      "Singra"
    ]
  },
  {
    "zila": "Netrokona",
    "upazilas": [
      "Atpara",
      "Barhatta",
      "Durgapur",
      "Kalmakanda",
      "Kendua",
      "Khaliajuri",
      "Madan",
      "Mohongonj",
      "Netrokona Sadar",
      "Purbadhala"
    ]
  },
  {
    "zila": "Nilphamari",
    "upazilas": [
      "Dimla",
      "Domar",
      "Jaldhaka",
      "Kishorganj",
      "Nilphamari Sadar",
      "Syedpur"
    ]
  },
  {
    "zila": "Noakhali",
    "upazilas": [
      "Begumganj",
      "Chatkhil",
      "Companiganj",
      "Hatia",
      "Kabirhat",
      "Noakhali Sadar",
      "Senbug",
      "Sonaimori",
      "Subarnachar"
    ]
  },
  {
    "zila": "Pabna",
    "upazilas": [
      "Atghoria",
      "Bera",
      "Bhangura",
      "Chatmohar",
      "Faridpur",
      "Ishurdi",
      "Pabna Sadar",
      "Santhia",
      "Sujanagar"
    ]
  },
  {
    "zila": "Panchagarh",
    "upazilas": [
      "Atwari",
      "Boda",
      "Debiganj",
      "Panchagarh Sadar",
      "Tetulia"
    ]
  },
  {
    "zila": "Patuakhali",
    "upazilas": [
      "Bauphal",
      "Dashmina",
      "Dumki",
      "Galachipa",
      "Kalapara",
      "Mirzaganj",
      "Patuakhali Sadar",
      "Rangabali"
    ]
  },
  {
    "zila": "Pirojpur",
    "upazilas": [
      "Bhandaria",
      "Kawkhali",
      "Mathbaria",
      "Nazirpur",
      "Nesarabad",
      "Pirojpur Sadar",
      "Zianagar"
    ]
  },
  {
    "zila": "Rajbari",
    "upazilas": [
      "Baliakandi",
      "Goalanda",
      "Kalukhali",
      "Pangsa",
      "Rajbari Sadar"
    ]
  },
  {
    "zila": "Rajshahi",
    "upazilas": [
      "Bagha",
      "Bagmara",
      "Charghat",
      "Durgapur",
      "Godagari",
      "Mohonpur",
      "Paba",
      "Puthia",
      "Tanore"
    ]
  },
  {
    "zila": "Rangamati",
    "upazilas": [
      "Baghaichari",
      "Barkal",
      "Belaichari",
      "Juraichari",
      "Kaptai",
      "Kawkhali",
      "Langadu",
      "Naniarchar",
      "Rajasthali",
      "Rangamati Sadar"
    ]
  },
  {
    "zila": "Rangpur",
    "upazilas": [
      "Badargonj",
      "Gangachara",
      "Kaunia",
      "Mithapukur",
      "Pirgacha",
      "Pirgonj",
      "Rangpur Sadar",
      "Taragonj"
    ]
  },
  {
    "zila": "Satkhira",
    "upazilas": [
      "Assasuni",
      "Debhata",
      "Kalaroa",
      "Kaliganj",
      "Satkhira Sadar",
      "Shyamnagar",
      "Tala"
    ]
  },
  {
    "zila": "Shariatpur",
    "upazilas": [
      "Bhedarganj",
      "Damudya",
      "Gosairhat",
      "Naria",
      "Shariatpur Sadar",
      "Zajira"
    ]
  },
  {
    "zila": "Sherpur",
    "upazilas": [
      "Jhenaigati",
      "Nalitabari",
      "Nokla",
      "Sherpur Sadar",
      "Sreebordi"
    ]
  },
  {
    "zila": "Sirajganj",
    "upazilas": [
      "Belkuchi",
      "Chauhali",
      "Kamarkhand",
      "Kazipur",
      "Raigonj",
      "Shahjadpur",
      "Sirajganj Sadar",
      "Tarash",
      "Ullapara"
    ]
  },
  {
    "zila": "Sunamganj",
    "upazilas": [
      "Bishwambarpur",
      "Chhatak",
      "Derai",
      "Dharmapasha",
      "Dowarabazar",
      "Jagannathpur",
      "Jamalganj",
      "Madhyanagar",
      "Shalla",
      "South Sunamganj",
      "Sunamganj Sadar",
      "Tahirpur"
    ]
  },
  {
    "zila": "Sylhet",
    "upazilas": [
      "Balaganj",
      "Beanibazar",
      "Bishwanath",
      "Companiganj",
      "Dakshinsurma",
      "Fenchuganj",
      "Golapganj",
      "Gowainghat",
      "Jaintiapur",
      "Kanaighat",
      "Osmaninagar",
      "Sylhet Sadar",
      "Zakiganj"
    ]
  },
  {
    "zila": "Tangail",
    "upazilas": [
      "Basail",
      "Bhuapur",
      "Delduar",
      "Dhanbari",
      "Ghatail",
      "Gopalpur",
      "Kalihati",
      "Madhupur",
      "Mirzapur",
      "Nagarpur",
      "Sakhipur",
      "Tangail Sadar"
    ]
  },
  {
    "zila": "Thakurgaon",
    "upazilas": [
      "Baliadangi",
      "Haripur",
      "Pirganj",
      "Ranisankail",
      "Thakurgaon Sadar"
    ]
  }
];
