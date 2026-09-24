const {chromium}=require('C:/Users/lnc/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright');
const fs=require('fs');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const page=await browser.newPage({viewport:{width:390,height:844}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4200');
 await page.getByText('Quick Demo Login',{exact:false}).click();
 await page.waitForTimeout(800);
 console.log('DEMO LOGIN:',(await page.locator('body').innerText()).slice(0,350));
 const screens=['MainTabs','Appointments','CarePlan','CareHub','Profile','Notifications','Reports','Search','BookingFlow','CaregiverGuide','SupportDirectory','HelpSupport','LegalPolicy','DailyCheckIn','CheckInComplete','SelfHelpTool','EducationLibrary','BlogsArticles','Prescription','DeviceCheck','VideoConsultation','Feedback','RescheduleAppointment','CancelRefund','BookFollowUp','ProfileSetup','Consent'];
 fs.mkdirSync('artifacts/ui/patient-audit',{recursive:true});
 for(const name of screens){
  await page.evaluate(n=>window.__navigateToScreen(n,{consultationId:'cons-001'}),name);
  await page.waitForTimeout(550);
  await page.screenshot({path:`artifacts/ui/patient-audit/${name}.png`});
  console.log(name, (await page.locator('body').innerText()).length,'characters');
 }
 fs.writeFileSync('artifacts/ui/patient-audit/result.json',JSON.stringify({screens,errors},null,2));
 console.log('ERRORS',JSON.stringify(errors));
 await browser.close();
 if(errors.length)process.exitCode=1;
})();
