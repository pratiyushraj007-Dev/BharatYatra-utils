/**
 * Comprehensive Indian Airport Database
 * Includes state/UT mapping so users can search by state name.
 * Source: DGCA / AAI airport listings
 */

const AIRPORTS = {
  // ─── Andhra Pradesh ───
  VTZ: { city: "Visakhapatnam", state: "Andhra Pradesh", name: "Visakhapatnam Airport" },
  TIR: { city: "Tirupati", state: "Andhra Pradesh", name: "Tirupati Airport" },
  VGA: { city: "Vijayawada", state: "Andhra Pradesh", name: "Vijayawada Airport" },
  RJA: { city: "Rajahmundry", state: "Andhra Pradesh", name: "Rajahmundry Airport" },
  CDP: { city: "Kadapa", state: "Andhra Pradesh", name: "Kadapa Airport" },

  // ─── Arunachal Pradesh ───
  IXN: { city: "Khonsa", state: "Arunachal Pradesh", name: "Khonsa Airport" },
  HGI: { city: "Itanagar", state: "Arunachal Pradesh", name: "Donyi Polo Airport" },
  IXT: { city: "Pasighat", state: "Arunachal Pradesh", name: "Pasighat Airport" },
  ZER: { city: "Zero (Ziro)", state: "Arunachal Pradesh", name: "Ziro Airport" },
  TEI: { city: "Tezu", state: "Arunachal Pradesh", name: "Tezu Airport" },

  // ─── Assam ───
  GAU: { city: "Guwahati", state: "Assam", name: "Lokpriya Gopinath Bordoloi International Airport" },
  DIB: { city: "Dibrugarh", state: "Assam", name: "Dibrugarh Airport" },
  JRH: { city: "Jorhat", state: "Assam", name: "Jorhat Airport" },
  IXS: { city: "Silchar", state: "Assam", name: "Silchar Airport" },
  TEZ: { city: "Tezpur", state: "Assam", name: "Tezpur Airport" },
  IXI: { city: "Lilabari (North Lakhimpur)", state: "Assam", name: "Lilabari Airport" },

  // ─── Bihar ───
  PAT: { city: "Patna", state: "Bihar", name: "Jay Prakash Narayan International Airport" },
  GAY: { city: "Gaya", state: "Bihar", name: "Gaya Airport" },
  DBR: { city: "Darbhanga", state: "Bihar", name: "Darbhanga Airport" },

  // ─── Chhattisgarh ───
  RPR: { city: "Raipur", state: "Chhattisgarh", name: "Swami Vivekananda Airport" },
  BUP: { city: "Bilaspur", state: "Chhattisgarh", name: "Bilaspur Airport" },
  JGB: { city: "Jagdalpur", state: "Chhattisgarh", name: "Jagdalpur Airport" },

  // ─── Delhi ───
  DEL: { city: "New Delhi", state: "Delhi", name: "Indira Gandhi International Airport" },

  // ─── Goa ───
  GOI: { city: "Goa (Dabolim)", state: "Goa", name: "Goa International Airport (Dabolim)" },
  GOX: { city: "Goa (Mopa)", state: "Goa", name: "Manohar International Airport (Mopa)" },

  // ─── Gujarat ───
  AMD: { city: "Ahmedabad", state: "Gujarat", name: "Sardar Vallabhbhai Patel International Airport" },
  STV: { city: "Surat", state: "Gujarat", name: "Surat Airport" },
  RAJ: { city: "Rajkot", state: "Gujarat", name: "Rajkot Airport" },
  BDQ: { city: "Vadodara", state: "Gujarat", name: "Vadodara Airport" },
  BHJ: { city: "Bhuj", state: "Gujarat", name: "Bhuj Airport" },
  JGA: { city: "Jamnagar", state: "Gujarat", name: "Jamnagar Airport" },
  PBD: { city: "Porbandar", state: "Gujarat", name: "Porbandar Airport" },
  DIU: { city: "Diu", state: "Gujarat", name: "Diu Airport" },
  KDM: { city: "Kandla", state: "Gujarat", name: "Kandla Airport" },

  // ─── Haryana ───
  HSS: { city: "Hisar", state: "Haryana", name: "Hisar Airport" },

  // ─── Himachal Pradesh ───
  DHM: { city: "Dharamshala (Kangra)", state: "Himachal Pradesh", name: "Gaggal Airport" },
  KUU: { city: "Kullu (Manali)", state: "Himachal Pradesh", name: "Bhuntar Airport" },
  SLV: { city: "Shimla", state: "Himachal Pradesh", name: "Shimla Airport" },

  // ─── Jammu & Kashmir ───
  SXR: { city: "Srinagar", state: "Jammu & Kashmir", name: "Sheikh ul-Alam International Airport" },
  IXJ: { city: "Jammu", state: "Jammu & Kashmir", name: "Jammu Airport" },
  IXL: { city: "Leh", state: "Ladakh", name: "Kushok Bakula Rimpochee Airport" },

  // ─── Jharkhand ───
  IXR: { city: "Ranchi", state: "Jharkhand", name: "Birsa Munda Airport" },
  IXW: { city: "Jamshedpur", state: "Jharkhand", name: "Sonari Airport" },
  DEO: { city: "Deoghar", state: "Jharkhand", name: "Deoghar Airport" },

  // ─── Karnataka ───
  BLR: { city: "Bengaluru", state: "Karnataka", name: "Kempegowda International Airport" },
  IXE: { city: "Mangalore", state: "Karnataka", name: "Mangalore International Airport" },
  HBX: { city: "Hubli", state: "Karnataka", name: "Hubli Airport" },
  MYQ: { city: "Mysore", state: "Karnataka", name: "Mysore Airport" },
  BEP: { city: "Bellary", state: "Karnataka", name: "Bellary Airport" },
  IXG: { city: "Belgaum (Belagavi)", state: "Karnataka", name: "Belgaum Airport" },

  // ─── Kerala ───
  COK: { city: "Kochi", state: "Kerala", name: "Cochin International Airport" },
  TRV: { city: "Thiruvananthapuram", state: "Kerala", name: "Trivandrum International Airport" },
  CCJ: { city: "Kozhikode (Calicut)", state: "Kerala", name: "Calicut International Airport" },
  CNN: { city: "Kannur", state: "Kerala", name: "Kannur International Airport" },

  // ─── Madhya Pradesh ───
  IDR: { city: "Indore", state: "Madhya Pradesh", name: "Devi Ahilyabai Holkar Airport" },
  BHO: { city: "Bhopal", state: "Madhya Pradesh", name: "Raja Bhoj Airport" },
  JLR: { city: "Jabalpur", state: "Madhya Pradesh", name: "Jabalpur Airport" },
  GWL: { city: "Gwalior", state: "Madhya Pradesh", name: "Gwalior Airport" },
  KNP: { city: "Khajuraho", state: "Madhya Pradesh", name: "Khajuraho Airport" },

  // ─── Maharashtra ───
  BOM: { city: "Mumbai", state: "Maharashtra", name: "Chhatrapati Shivaji Maharaj International Airport" },
  PNQ: { city: "Pune", state: "Maharashtra", name: "Pune Airport" },
  NAG: { city: "Nagpur", state: "Maharashtra", name: "Dr. Babasaheb Ambedkar International Airport" },
  IXU: { city: "Aurangabad", state: "Maharashtra", name: "Aurangabad Airport" },
  KLH: { city: "Kolhapur", state: "Maharashtra", name: "Kolhapur Airport" },
  SAG: { city: "Shirdi", state: "Maharashtra", name: "Shirdi Airport" },
  NDC: { city: "Nanded", state: "Maharashtra", name: "Nanded Airport" },

  // ─── Manipur ───
  IMF: { city: "Imphal", state: "Manipur", name: "Bir Tikendrajit International Airport" },

  // ─── Meghalaya ───
  SHL: { city: "Shillong", state: "Meghalaya", name: "Shillong Airport" },

  // ─── Mizoram ───
  AJL: { city: "Aizawl", state: "Mizoram", name: "Lengpui Airport" },

  // ─── Nagaland ───
  DMU: { city: "Dimapur", state: "Nagaland", name: "Dimapur Airport" },

  // ─── Odisha ───
  BBI: { city: "Bhubaneswar", state: "Odisha", name: "Biju Patnaik International Airport" },
  JRG: { city: "Jharsuguda", state: "Odisha", name: "Veer Surendra Sai Airport" },

  // ─── Punjab ───
  ATQ: { city: "Amritsar", state: "Punjab", name: "Sri Guru Ram Dass Jee International Airport" },
  IXC: { city: "Chandigarh", state: "Punjab", name: "Chandigarh International Airport" },
  LUH: { city: "Ludhiana", state: "Punjab", name: "Sahnewal Airport" },
  PGH: { city: "Pathankot", state: "Punjab", name: "Pathankot Airport" },
  BUY: { city: "Bathinda", state: "Punjab", name: "Bathinda Airport" },

  // ─── Rajasthan ───
  JAI: { city: "Jaipur", state: "Rajasthan", name: "Jaipur International Airport" },
  UDR: { city: "Udaipur", state: "Rajasthan", name: "Maharana Pratap Airport" },
  JDH: { city: "Jodhpur", state: "Rajasthan", name: "Jodhpur Airport" },
  JSA: { city: "Jaisalmer", state: "Rajasthan", name: "Jaisalmer Airport" },
  BKB: { city: "Bikaner", state: "Rajasthan", name: "Nal Airport" },
  KTU: { city: "Kota", state: "Rajasthan", name: "Kota Airport" },
  AJM: { city: "Ajmer (Kishangarh)", state: "Rajasthan", name: "Kishangarh Airport" },

  // ─── Sikkim ───
  PYG: { city: "Pakyong (Gangtok)", state: "Sikkim", name: "Pakyong Airport" },

  // ─── Tamil Nadu ───
  MAA: { city: "Chennai", state: "Tamil Nadu", name: "Chennai International Airport" },
  CJB: { city: "Coimbatore", state: "Tamil Nadu", name: "Coimbatore International Airport" },
  IXM: { city: "Madurai", state: "Tamil Nadu", name: "Madurai Airport" },
  TRZ: { city: "Tiruchirappalli", state: "Tamil Nadu", name: "Tiruchirappalli International Airport" },
  TUT: { city: "Tuticorin", state: "Tamil Nadu", name: "Tuticorin Airport" },
  SLM: { city: "Salem", state: "Tamil Nadu", name: "Salem Airport" },

  // ─── Telangana ───
  HYD: { city: "Hyderabad", state: "Telangana", name: "Rajiv Gandhi International Airport" },
  WRG: { city: "Warangal", state: "Telangana", name: "Warangal Airport" },

  // ─── Tripura ───
  IXA: { city: "Agartala", state: "Tripura", name: "Maharaja Bir Bikram Airport" },

  // ─── Uttar Pradesh ───
  LKO: { city: "Lucknow", state: "Uttar Pradesh", name: "Chaudhary Charan Singh International Airport" },
  VNS: { city: "Varanasi", state: "Uttar Pradesh", name: "Lal Bahadur Shastri International Airport" },
  AGR: { city: "Agra", state: "Uttar Pradesh", name: "Agra Airport" },
  GOP: { city: "Gorakhpur", state: "Uttar Pradesh", name: "Gorakhpur Airport" },
  KNU: { city: "Kanpur", state: "Uttar Pradesh", name: "Kanpur Airport" },
  AYJ: { city: "Ayodhya", state: "Uttar Pradesh", name: "Maharishi Valmiki International Airport" },
  JHN: { city: "Jhansi", state: "Uttar Pradesh", name: "Jhansi Airport" },
  BEK: { city: "Bareilly", state: "Uttar Pradesh", name: "Bareilly Airport" },
  PYQ: { city: "Prayagraj (Allahabad)", state: "Uttar Pradesh", name: "Prayagraj Airport" },

  // ─── Uttarakhand ───
  DED: { city: "Dehradun", state: "Uttarakhand", name: "Jolly Grant Airport" },
  PGH: { city: "Pantnagar", state: "Uttarakhand", name: "Pantnagar Airport" },

  // ─── West Bengal ───
  CCU: { city: "Kolkata", state: "West Bengal", name: "Netaji Subhas Chandra Bose International Airport" },
  IXB: { city: "Bagdogra (Siliguri)", state: "West Bengal", name: "Bagdogra Airport" },

  // ─── Union Territories ───
  IXZ: { city: "Port Blair", state: "Andaman & Nicobar", name: "Veer Savarkar International Airport" },
};

module.exports = AIRPORTS;
