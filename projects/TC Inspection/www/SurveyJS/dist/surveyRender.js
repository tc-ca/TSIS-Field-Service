let uiLang = 'en';
const questionnaire = {
  id: '',
  jsonContent: '',
  userInput: '',
  isCompleted: ''
};
function LoadQuestionnaireData(inspectionId) {
  const fetchXml = [
    "<fetch resultformat='JSON' top='50'>",
    "  <entity name='tc_questionnaire'>",
    "    <attribute name='tc_jsoncontent' alias='tc_jsoncontent' />",
    "    <attribute name='tc_iscompleted' alias='tc_iscompleted' />",
    "    <attribute name='tc_userinput' alias='tc_userinput' />",
    "    <attribute name='tc_questionnaireid' alias='tc_questionnaireid' />",
    "    <link-entity name='tc_tcinspection' from='tc_questionnaire' to='tc_questionnaireid'>",
    '      <filter>',
    "        <condition attribute='tc_tcinspectionid' operator='eq' value='",
    inspectionId /*2af3ff98-84f1-4731-835b-2d2fbbad8816*/,
    "'/>",
    '      </filter>',
    '    </link-entity>',
    '  </entity>',
    '</fetch>'
  ].join('');

  MobileCRM.FetchXml.Fetch.executeFromXML(
    fetchXml,
    RenderSurvey,
    MobileCRM.bridge.alert,
    null
  );
}

window.onload = function () {
  MobileCRM.Configuration.requestObject(
    function (config) {
      /// <param name="config" type="MobileCRM.Configuration">/<param>

      const settings = config.settings;
      if (settings != '') {
        uiLang = settings.language.substring(0, 2);
      }

      // we have done no changes, thus return false to disallow sending the changes back to C#.
      return false;
    },
    function (err) {
      /// <param name="err" type="String">/<param>
      MobileCRM.bridge.alert('An error occurred: ' + err);
    },
    null
  );
  MobileCRM.UI.EntityForm.requestObject(
    function (entityForm) {
      /// <param name='entityForm' type='MobileCRM.UI.EntityForm'/>
      if (entityForm.entity != null) {
        // const questionnaireID = entityForm.entity.id;
        const inspepctionId = entityForm.entity.id;
        LoadQuestionnaireData(inspepctionId);
      }
      return true;
    },
    function (error) {
      MobileCRM.bridge.alert('An error occurred: ' + error);
    },
    null
  );
};

function RenderSurvey(results) {
  if (results == null) return false;
  questionnaire.id = results[0].tc_questionnaireid;
  questionnaire.jsonContent = JSON.parse(results[0].tc_jsoncontent);
  if (results[0].tc_userinput != null) {
    questionnaire.userInput = JSON.parse(results[0].tc_userinput);
  }
  questionnaire.isCompleted = results[0].tc_iscompleted;

  Survey.StylesManager.applyTheme('modern');
  window.survey = new Survey.Model(questionnaire.jsonContent);
  if (questionnaire.userInput != null) {
    survey.data = questionnaire.userInput;
  }
  survey.locale = uiLang;
  survey.onComplete.add(function (answer) {
    SaveAnswers(answer);
    // document.querySelector('#surveyResult').textContent =
    //   'Result JSON:\n' + JSON.stringify(result.data, null, 3);
    const surveyPDF = new SurveyPDF.SurveyPDF(questionnaire.jsonContent);
    surveyPDF.data = survey.data;
    surveyPDF.raw('dataurlstring').then(function (dataurl) {
      SavePDF(dataurl);
    });
  });

  $('#surveyElement').Survey({
    model: survey,
    onValueChanged: surveyValueChanged
  });
}

const surveyValueChanged = function (sender, options) {
  const el = document.getElementById(options.name);
  if (el) {
    el.value = options.value;
  }
};

function SaveAnswers(userInput) {
  /// <param name='entityForm' type='MobileCRM.UI.EntityForm'/>
  MobileCRM.DynamicEntity.loadById(
    'tc_questionnaire',
    questionnaire.id,
    function (entity) {
      entity.properties.tc_userinput = JSON.stringify(userInput.data, null, 3);
      entity.save(function (error) {
        if (error) MobileCRM.bridge.alert('An error occurred: ' + error);
      });
    },
    function (error) {
      MobileCRM.bridge.alert('An error occurred: ' + error);
    },
    null
  );

  return true;

  //MobileCRM.UI.EntityForm.saveAndClose();
}

const createAnnotation = function (regarding, fileInfo, documentBody) {
  /// <param name='regrding' type='MobileCRM.Refernce'/>
  /// <param name='fileInfo' type='MobileCRM.Settings._fileInfo'/>
  /// <param name='documentBody' type='base64'>File base 64 string.<param>

  const note = MobileCRM.DynamicEntity.createNew('annotation');
  note.properties.filename = 'PDFReport.pdf';
  note.properties.mimetype = 'application/pdf';
  note.properties.isdocument = 1;
  note.properties.documentbody =
    documentBody.slice(documentBody.indexOf(',') + 1) || ' ';

  note.properties.subject = 'PDF report doucment';
  note.properties.notetext = 'Survey JS questionnaire PDF report';

  note.properties.objectid = regarding;

  note.save(function (err) {
    if (err) MobileCRM.bridge.alert(err);
    // display newly created annotation
    //MobileCRM.UI.FormManager.showEditDialog(this.entityName, this.id);
    //if (fileInfo.url) {
    //  $('#imgSignature').attr('src', fileInfo.url);
    //}
  });
};

function SavePDF(text) {
  MobileCRM.UI.EntityForm.requestObject(
    function (entityForm) {
      createAnnotation(entityForm.entity, 'PDFReport.pdf', text);
      return true;
    },
    function (error) {
      MobileCRM.bridge.alert('An error occurred: ' + error);
    },
    null
  );
}
