
export const SchoolStaffRoles= [
  {
    value: "Headmaster",
    label: "Headmaster",
  },
  {
    value: "HeadTeacher",
    label: "Head Teacher",
  },
  {
    value: "DeputyHeadTeacher",
    label: "Deputy Head Teacher",
  },
  {
    value: "DirectorOfStudies",
    label: "Director of Studies", // Often responsible for academic affairs
  },
   {
    value: "HeadOfDepartment",
    label: "Head of Department", // For specific subjects or faculties
  },
  {
    value: "Librarian",
    label: "Librarian",
  },
  {
    value: "SchoolSecretary",
    label: "School Secretary", // Administrative support
  },
  {
    value: "Accountant",
    label: "Accountant", // School finances
  },
  {
    value: "SchoolCounselor",
    label: "School Counselor", // Guidance and counselling
  },
  {
    value: "Janitor",
    label: "Janitor", // Cleaning and maintenance
  },
  {
    value: "SecurityGuard",
    label: "Security Guard", // School security
  },
   {
    value: "Cook",
    label: "Cook", // For schools with feeding programs
  },
   {
    value: "Nurse",
    label: "Nurse", // School health services
  },
   {
    value: "LabTechnician",
    label: "Lab Technician", // For science labs
  },
];
export const validSchoolStaffRoles = SchoolStaffRoles.map(role => role.value) as [string, ...string[]]; 